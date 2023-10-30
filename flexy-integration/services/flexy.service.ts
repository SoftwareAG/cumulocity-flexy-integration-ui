import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
import { Talk2MPool, Talk2MUrlOptions } from '@flexy/models/talk2m.model';
import { DevlogService } from './devlog.service';
import { EWONFlexyDeviceRegistrationService } from './ewon-flexy-device-registration.service';
import { ExternalIDService } from './external-id.service';
import { Talk2mRequestService } from './talk2m-request.service';
import { Talk2MService } from './talk2m.service';

@Injectable({
  providedIn: 'root'
})
export class FlexyService extends DevlogService {
  constructor(
    private http: HttpClient,
    private talk2m: Talk2MService,
    private talk2mRequest: Talk2mRequestService,
    private flexyRegistrationService: EWONFlexyDeviceRegistrationService,
    private externalIDService: ExternalIDService,
    private deviceRegistrationService: DeviceRegistrationService
  ) {
    super();
    // this.devLogEnabled = true;
    this.devLogPrefix = 'F.S';
  }

  async getEwons(session: string, pool?: string): Promise<HttpResponse<any>> {
    // TODO use session from appService
    this.devLog('getEwons', { pool });

    const config: Talk2MUrlOptions = { session };
    if (pool) config.pool = pool;

    return await this.http
      .get<any>(this.talk2mRequest.buildUrl('getewons', config), { observe: 'response' })
      .toPromise();
  }

  async getEwonsByPool(session: string, pool: Talk2MPool): Promise<EwonFlexyStructure[]> {
    this.devLog('getEwonsByPool', { session, pool });
    const response = await this.getEwons(session, pool.id);
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

  async getEwonsOfPools(session: string, pools: Talk2MPool[]): Promise<EwonFlexyStructure[]> {
    // TODO use session from appService
    this.devLog('getEwonsOfPools', { session, pools });
    const response = await Promise.all(pools.map((pool) => this.getEwonsByPool(session, pool)));
    this.devLog('getEwonsOfPools|response', response);
    return response.reduce((prev, next) => [...prev, ...next], <EwonFlexyStructure[]>[]);
  }

  async getSerial(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('getSerial', { deviceName, config });
    const url = this.talk2mRequest.buildUrl(`get/${deviceName}/rcgi.bin/ParamForm`, {
      session: config.session,
      deviceName,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_Param: '$dtES'
    });
    const res = await this.http.get<any>(url, this.talk2mRequest.generateHeaderOptions()).toPromise();
    // grab serial from response (temp solution?);
    const regEx = new RegExp(/SerNum:(\d{4}-\d{4}-\d{2})/gm);
    const serial = res.match(regEx);

    return serial.length ? serial[0].substring(7) : '';
  }

  async installSoftware(file: FlexyCommandFile, deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('installSoftware', { file, deviceName, config });
    // new: REQUESTHTTPX "${url}","GET","","","","/usr/${fileName}"
    // old: 'GETHTTP ' + [...[file.server], ...file.files].join(',')
    const url = file.server + file.files[0];
    const fileName = url.split(/\/+/).pop();
    const command = `REQUESTHTTPX+"${url}","GET","","","","/usr/${fileName}"`;

    return await this.talk2m.execScript(command, deviceName, config);
  }

  async downloadSoftware(filename: string, deviceName: string, config: FlexySettings): Promise<boolean> {
    this.devLog('downloadSoftware', { filename, deviceName, config });
    const dl = await this.talk2m.downloadFile(filename, deviceName, config);
    // this.devLog('downloadSoftware|response', dl);
    return !!dl;
  }

  async reboot(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('reboot', { deviceName, config });
    // return await this.talk2m.execScript('REBOOT', deviceName, config);
    return await this.talk2m.restart(deviceName, config);
  }

  async registerFlexy(ewon: EwonFlexyStructure, deviceGroupId?: string): Promise<EwonFlexyStructure> {
    this.devLog('registerFlexy', { ewon, deviceGroupId });
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
    this.devLog('registerFlexy|deviceMO', deviceMO);
    if (!deviceMO) return Promise.reject('Create device invenotry failed.');

    // 2.1 Change owner
    const deviceInventoryMO = await this.flexyRegistrationService.setDevivceOwnerExternalId(
      FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId,
      deviceMO.id
    );
    this.devLog('registerFlexy|deviceInventoryMO', deviceInventoryMO);
    if (!deviceInventoryMO) return Promise.reject('Device owner was not set.');

    // 3. Assign externalId to inventory
    const identityMO = await this.createExternalIDForDevice(deviceInventoryMO, ewonId);
    this.devLog('registerFlexy|identityMO', identityMO);
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

  removeDuplicates(c8y: EwonFlexyStructure[], t2m: EwonFlexyStructure[]): EwonFlexyStructure[] {
    this.devLog('removeDuplicates', { c8y, t2m });

    const uniques = t2m.map((ewon) => {
      const duplicate = c8y.find((element) => element.id == ewon.id);
      if (duplicate) {
        this.devLog('removeDuplicates|duplicate', duplicate);
        c8y.splice(c8y.indexOf(duplicate), 1);
        return { ...duplicate, ...ewon };
      }
      return ewon;
    });

    return [...c8y, ...uniques];
  }

  // new
  private getExternalIDString(id): string {
    this.devLog('getExternalIDString', { id });
    return FLEXY_EXTERNALID_FLEXY_PREFIX + id;
  }

  async getExternalID(id): Promise<IExternalIdentity> {
    this.devLog('getExternalID', { id });
    return this.externalIDService.getExternalID(this.getExternalIDString(id), EXTERNALID_FLEXY_SERIALTYPE);
  }

  async createExternalIDForDevice(deviceMO: IManagedObject, externalID: string): Promise<IExternalIdentity> {
    this.devLog('createExternalIDForDevice', { deviceMO, externalID });
    return this.externalIDService.createExternalIDForDevice(
      deviceMO.id,
      this.getExternalIDString(externalID),
      EXTERNALID_FLEXY_SERIALTYPE
    );
  }

  async getDeviceByExternalID(externalID: string): Promise<IManagedObject> {
    this.devLog('getDeviceByExternalID', { externalID });
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

      console.log('fetchConnectorReleases|data', data);
      // releases.push(...data);
    } catch (err) {
      console.log('fetchConnectorReleases|error', err);
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
    this.devLog('xxx', { ewon, prefix });
    const ewonId = String(ewon.serial);
    const prefixedEwonId = prefix + ewonId;

    // device has registration?
    const existingRequest = await this.deviceHasRegisterRequest(prefixedEwonId);

    if (existingRequest) {
      return Promise.reject('Device registration already existing.');
    }

    this.devLog('createRegistration|createDeviceRequestRegistration', prefixedEwonId);
    const registration = await this.deviceRegistrationService.create({ id: prefixedEwonId });

    if (!registration.data) {
      return Promise.reject('Could not create device registration.');
    }

    return ewon;
  }

  async acceptRegistration(ewon: EwonFlexyStructure, prefix = FLEXY_EXTERNALID_FLEXY_PREFIX): Promise<boolean> {
    this.devLog('acceptRegistration', { ewon, prefix });
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
}
