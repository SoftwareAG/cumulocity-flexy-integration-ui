import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { DeviceRegistrationService, IExternalIdentity, IManagedObject } from '@c8y/client';
import {
  EXTERNALID_FLEXY_SERIALTYPE,
  EXTERNALID_TALK2M_SERIALTYPE,
  FLEXY_CONNECTOR_RELEASE_LIST_URL,
  FLEXY_EXTERNALID_FLEXY_PREFIX,
  FLEXY_EXTERNALID_TALK2M_PREFIX
} from '@flexy/constants/flexy-integration.constants';
import {
  EwonFlexyStructure,
  FlexyCommandFile,
  FlexyConnectorRelease,
  FlexyIntegrated,
  FlexySettings
} from '@flexy/models/flexy.model';
import { PluginConfig } from '@flexy/models/plugin.model';
import { Talk2MAccount, Talk2MPool, Talk2MUrlOptions } from '@flexy/models/talk2m.model';
import { Subscription } from 'rxjs';
import { EWONFlexyDeviceRegistrationService } from './ewon-flexy-device-registration.service';
import { ExternalIDService } from './external-id.service';
import { Talk2mService } from './talk2m.service';

@Injectable({ providedIn: 'root' })
export class FlexyService implements OnDestroy {
  private subscriptions = new Subscription();
  private session: PluginConfig['session'];
  private account: Talk2MAccount;

  constructor(
    private http: HttpClient,
    private talk2mService: Talk2mService,
    private flexyRegistrationService: EWONFlexyDeviceRegistrationService,
    private externalIDService: ExternalIDService,
    private deviceRegistrationService: DeviceRegistrationService
  ) {
    this.subscriptions.add(this.talk2mService.session$.subscribe((session) => (this.session = session)));
    this.subscriptions.add(this.talk2mService.account$.subscribe((account) => (this.account = account)));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // TODO use session from appService
  async getEwons(session: string, pool?: string): Promise<HttpResponse<any>> {
    const config: Talk2MUrlOptions = { session };

    if (pool) config.pool = pool;

    return await this.http
      .get<any>(this.talk2mService.buildUrl('getewons', config), { observe: 'response' })
      .toPromise();
  }

  async getEwonsByPool(pool: Talk2MPool): Promise<EwonFlexyStructure[]> {
    const response = await this.getEwons(this.session, pool.id);
    if (!response || !response.hasOwnProperty('body') || !response.body.hasOwnProperty('ewons')) return null;

    return response.body.ewons.map((ewon: EwonFlexyStructure) => {
      ewon.pool = pool.name;
      ewon.talk2m_integrated = FlexyIntegrated.Integrated;

      this.flexyRegistrationService
        .isDeviceRegistered(ewon.id, FLEXY_EXTERNALID_TALK2M_PREFIX, EXTERNALID_TALK2M_SERIALTYPE)
        .then((result) => {
          ewon.registered = result ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
        });

      return ewon;
    });
  }

  async getEwonsOfPools(pools: Talk2MPool[]): Promise<EwonFlexyStructure[]> {
    const response = await Promise.all(pools.map((pool) => this.getEwonsByPool(pool)));
    return response.reduce((prev, next) => [...prev, ...next], <EwonFlexyStructure[]>[]);
  }

  async getSerial(
    deviceName: string,
    deviceUsername: FlexySettings['deviceUsername'],
    devicePassword: FlexySettings['devicePassword']
  ): Promise<string> {
    const url = this.talk2mService.buildUrl(`get/${deviceName}/rcgi.bin/ParamForm`, {
      deviceName,
      account: this.account.accountName,
      deviceUsername,
      devicePassword,
      AST_Param: '$dtES'
    });
    const res = await this.http.get<any>(url, this.talk2mService.generateHeaderOptions()).toPromise();
    const regEx = new RegExp(/SerNum:(\d{4}-\d{4}-\d{2})/gm);
    const serial = res.match(regEx);

    return serial.length ? serial[0].substring(7) : '';
  }

  async installSoftware(file: FlexyCommandFile, deviceName: string, config: FlexySettings): Promise<string> {
    const url = file.server + file.files[0];
    const fileName = url.split(/\/+/).pop();
    const command = `REQUESTHTTPX+"${url}","GET","","","","/usr/${fileName}"`;

    return await this.execScript(command, deviceName, config);
  }

  async downloadSoftware(filename: string, deviceName: string, config: FlexySettings): Promise<boolean> {
    const dl = await this.downloadFile(filename, deviceName, config);

    return !!dl;
  }

  async registerFlexy(ewon: EwonFlexyStructure, deviceGroupId?: string): Promise<EwonFlexyStructure> {
    const ewonId = ewon.id.toString();

    if (ewon.registered !== FlexyIntegrated.Not_integrated)
      return Promise.reject(`Device with ewonId "${ewonId}" is already registered.`);

    const requests = await this.flexyRegistrationService.getDeviceRequestRegistration();
    const existingRequest = requests.find((element) => element.id == FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId);

    if (!existingRequest) {
      // 1. Create device request
      await this.flexyRegistrationService.createDeviceRequestRegistration(ewonId);
      // 1.1 Bootstraps the device credentials
      await this.flexyRegistrationService.requestDeviceCredentials(ewonId);
      // 1.2 Change status to acceptance
      await this.flexyRegistrationService.acceptDeviceRequest(ewonId);
    }

    // 2. Create inventory managed object
    const deviceMO = await this.flexyRegistrationService.createDeviceInventory(ewon);
    if (!deviceMO) return Promise.reject('Create device invenotry failed.');

    // 2.1 Change owner
    const deviceInventoryMO = await this.flexyRegistrationService.setDevivceOwnerExternalId(
      FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId,
      deviceMO.id
    );
    if (!deviceInventoryMO) return Promise.reject('Device owner was not set.');

    // 3. Assign externalId to inventory
    const identityMO = await this.createExternalIDForDevice(deviceInventoryMO, ewonId);
    if (!identityMO) return Promise.reject('External ID was not assigned.');

    // 4. Assign group to inventory
    if (ewon.pool && deviceGroupId) {
      await this.flexyRegistrationService.addGroupChildAssetToDevice(
        deviceGroupId,
        identityMO.managedObject.id.toString()
      );
    }

    ewon.registered = FlexyIntegrated.Integrated;

    return ewon;
  }

  // new
  async getDeviceByExternalID(externalID: string): Promise<IManagedObject> {
    return this.externalIDService.getDeviceByExternalID(externalID, EXTERNALID_FLEXY_SERIALTYPE);
  }

  // TODO – CORS on request
  async fetchConnectorReleases(): Promise<FlexyConnectorRelease[]> {
    const releases: FlexyConnectorRelease[] = [];

    try {
      const data = await this.http
        .get<any>(FLEXY_CONNECTOR_RELEASE_LIST_URL, {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers':
              'Authorization, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization',
            'Access-Control-Allow-Methods': 'GET'
          }),
          responseType: 'json'
        })
        .toPromise();
      releases.push(...data);
    } catch (error: any) {
      console.log('fetchConnectorReleases|error', error.message);
    }

    // TODO remove on successful data pull
    releases.push({
      name: 'v1.3.6',
      jar: {
        name: 'flexy-cumulocity-connector-1.3.6-full.jar',
        download_url:
          'https://cumulocity-connector.s3.eu-central-1.amazonaws.com/v1.3.6/flexy-cumulocity-connector-1.3.6-full.jar'
      },
      configuration: {
        name: 'CumulocityConnectorConfig.json',
        download_url: 'https://cumulocity-connector.s3.eu-central-1.amazonaws.com/v1.3.6/CumulocityConnectorConfig.json'
      },
      jvmRun: {
        name: 'jvmrun',
        download_url: 'https://cumulocity-connector.s3.eu-central-1.amazonaws.com/v1.3.6/jvmrun'
      }
    });

    return releases;
  }

  isRegistered(ewon: EwonFlexyStructure): boolean {
    return ewon.registered !== FlexyIntegrated.Not_integrated;
  }

  async deviceHasRegisterRequest(ewonId: string): Promise<boolean> {
    const requests = await this.flexyRegistrationService.getDeviceRequestRegistration(true);

    return !!requests.find((element) => element.id == ewonId);
  }

  async createRegistration(
    ewon: EwonFlexyStructure,
    prefix = FLEXY_EXTERNALID_FLEXY_PREFIX
  ): Promise<EwonFlexyStructure> {
    const ewonId = String(ewon.serial);
    const prefixedEwonId = prefix + ewonId;

    // device has registration?
    const existingRequest = await this.deviceHasRegisterRequest(prefixedEwonId);

    if (existingRequest) {
      return Promise.reject('Device registration already existing.');
    }

    const registration = await this.deviceRegistrationService.create({ id: prefixedEwonId });

    if (!registration.data) {
      return Promise.reject('Could not create device registration.');
    }

    return ewon;
  }

  async acceptRegistration(ewon: EwonFlexyStructure, prefix = FLEXY_EXTERNALID_FLEXY_PREFIX): Promise<boolean> {
    const ewonId = String(ewon.serial);
    const prefixedEwonId = prefix + ewonId;

    const existingRequest = await this.deviceHasRegisterRequest(prefixedEwonId);
    if (!existingRequest) {
      return Promise.reject('Device has no open registration.');
    }

    const { data } = await this.deviceRegistrationService.accept(prefixedEwonId);

    return data && !!data.id;
  }

  // async bulkAccept(devices: EwonFlexyStructure[], prefix = FLEXY_EXTERNALID_FLEXY_PREFIX) {
  //   // build promise.all
  //   devices.forEach((d) => {
  //     const ewonId = String(d.serial);
  //     const prefixedEwonId = prefix + ewonId;

  //     const existingRequest = await this.deviceHasRegisterRequest(prefixedEwonId);
  //   });

  //   // acceptRegistration();
  // }

  // -------------------
  // old talk2m service port
  // -------------------
  async execScript(command: string, deviceName: string, config: FlexySettings): Promise<string> {
    const url = this.talk2mService.buildUrl(`get/${deviceName}/rcgi.bin/ExeScriptForm`, {
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      Command1: command
    });

    return await this.http.get<any>(url, this.talk2mService.generateHeaderOptions()).toPromise();
  }

  async reboot(deviceName: string, config: FlexySettings): Promise<string> {
    const url = this.talk2mService.buildUrl(`get/${deviceName}/rcgi.bin/wsdForm`, {
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_ErrorMsg: 'Reboot%20will%20occur...',
      com_Csave: 1,
      resetAction: 1,
      com_BootOp: 0
    });

    return await this.http.get<any>(url, this.talk2mService.generateHeaderOptions()).toPromise();
  }

  async downloadFile(filename: string, deviceName: string, config): Promise<string> {
    const url = this.talk2mService.buildUrl(`get/${deviceName}/usr/${filename}`, {
      AST_Param: '$dtIV $ftT $st_m3', // issue #27 - usage unknown
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword
    });

    return await this.http.get<any>(url, this.talk2mService.generateHeaderOptions()).toPromise();
  }

  // flexyService EXTERNALID_FLEXY_SERIALTYPE
  // talk2mService » EXTERNALID_TALK2M_SERIALTYPE
  async getExternalID(id, type = EXTERNALID_FLEXY_SERIALTYPE): Promise<IExternalIdentity> {
    return this.externalIDService.getExternalID(this.getExternalIDString(id), type);
  }

  // flexyService EXTERNALID_FLEXY_SERIALTYPE
  // talk2mService » EXTERNALID_TALK2M_SERIALTYPE
  async createExternalIDForDevice(deviceMO: IManagedObject, externalID: string, type = EXTERNALID_FLEXY_SERIALTYPE): Promise<IExternalIdentity> {
    return this.externalIDService.createExternalIDForDevice(
      deviceMO.id,
      this.getExternalIDString(externalID),
      type
    );
  }

  async sendConfig(deviceName: string, config: FlexySettings): Promise<boolean> {
    const url = this.talk2mService.buildUrl(`get/${deviceName}/rcgi.bin/jvmForm`, {
      formName: 'overwriteBootstrapAuth', // 'setBootstrapAuth',
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      port: config.c8yPort,
      c8yUser: config.c8yUsername,
      c8yPass: config.c8yPassword,
      host: config.c8yHost,
      tenant: config.c8yTenant
    });

    return await this.http.get<any>(url, this.talk2mService.generateHeaderOptions()).toPromise();
  }

  private getExternalIDString(id): string {
    return FLEXY_EXTERNALID_TALK2M_PREFIX + id;
  }
}
