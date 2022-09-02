import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IIdentified } from '@c8y/client';
import { EXTERNALID_TALK2M_SERIALTYPE, FLEXY_EXTERNALID_TALK2M_PREFIX } from '@constants/flexy-integration.constants';
import {
  EwonFlexyStructure,
  FlexyCommandFile,
  FlexyIntegrated,
  FlexySettings,
  T2MPool,
  t2mUrlOptions
} from '@interfaces/flexy.interface';
import { DevlogService } from './devlog.service';
import { EWONFlexyDeviceRegistrationService } from './ewon-flexy-device-registration.service';
import { Talk2MService } from './talk2m.service';

@Injectable({
  providedIn: 'root'
})
export class FlexyService extends DevlogService {
  constructor(
    private talk2m: Talk2MService,
    private http: HttpClient,
    private flexyRegistrationService: EWONFlexyDeviceRegistrationService
  ) {
    super();
    this.devLogEnabled = false;
    this.devLogPrefix = 'F.S';
  }

  async getEwons(session: string, pool?: string): Promise<HttpResponse<any>> {
    // TODO use session from appService
    this.devLog('getEwons', { pool });

    const config: t2mUrlOptions = { session };
    if (pool) config.pool = pool;

    return await this.http.get<any>(this.talk2m.buildUrl('getewons', config), { observe: 'response' }).toPromise();
  }

  async getEwonsByPool(session: string, pool: T2MPool): Promise<EwonFlexyStructure[]> {
    this.devLog('getEwonsByPool', { session, pool });
    const response = await this.getEwons(session, pool.id);
    if (!response || !response.hasOwnProperty('body') || !response.body.hasOwnProperty('ewons')) return;

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

  async getEwonsOfPools(session: string, pools: T2MPool[]): Promise<EwonFlexyStructure[]> {
    // TODO use session from appService
    this.devLog('getEwonsOfPools', { session, pools });
    const response = await Promise.all(pools.map((pool) => this.getEwonsByPool(session, pool)));
    this.devLog('getEwonsOfPools|response', response);
    return response.reduce((prev, next) => [...prev, ...next], <EwonFlexyStructure[]>[]);
  }

  async getSerial(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('getSerial', { deviceName, config });
    const url = this.talk2m.buildUrl(`get/${deviceName}/rcgi.bin/ParamForm`, {
      session: config.session,
      deviceName,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_Param: '$dtES'
    });
    return await this.http.get<any>(url, this.talk2m.generateHeaderOptions()).toPromise();
  }

  async installSoftware(file: FlexyCommandFile, deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('installSoftware', { file, deviceName, config });
    return await this.talk2m.execScript('GETHTTP ' + [...[file.server], ...file.files].join(','), deviceName, config);
  }

  async downloadSoftware(filename: string, deviceName: string, config: FlexySettings): Promise<boolean> {
    this.devLog('downloadSoftware', { filename, deviceName, config });
    const dl = await this.talk2m.downloadFile(filename, deviceName, config);
    this.devLog('downloadSoftware|response', dl);
    return !!dl; // TODO check response
  }

  async reboot(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('reboot', { deviceName, config });
    return await this.talk2m.execScript('REBOOT', deviceName, config);
  }

  async registerFlexy(ewon: EwonFlexyStructure, deviceGroupId?: string): Promise<EwonFlexyStructure> {
    this.devLog('registerFlexy', { ewon, deviceGroupId });
    const ewonId = ewon.id.toString();

    if (ewon.registered !== FlexyIntegrated.Not_integrated) return Promise.reject(`Device with ewonId "${ewonId}" is already registered.`);

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
    const identityMO = await this.flexyRegistrationService.createIdentidyForDevice(
      deviceInventoryMO.id,
      ewonId,
      FLEXY_EXTERNALID_TALK2M_PREFIX,
      EXTERNALID_TALK2M_SERIALTYPE
    );
    this.devLog('registerFlexy|identityMO', identityMO);
    if (!identityMO) return Promise.reject('External ID was not assigned.');

    // 4. Assign group to inventory
    if (ewon.pool && deviceGroupId) {
      await this.flexyRegistrationService.addGroupChildAssetToDevice(deviceGroupId, identityMO.managedObject.id.toString());
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
}
