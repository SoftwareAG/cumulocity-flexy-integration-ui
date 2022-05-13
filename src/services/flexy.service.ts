import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

  async reboot(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('reboot', { deviceName, config });
    return await this.talk2m.execScript('REBOOT', deviceName, config);
  }

  removeDuplicates(c8y: EwonFlexyStructure[], t2m: EwonFlexyStructure[]): EwonFlexyStructure[] {
    this.devLog('removeDuplicates', { c8y, t2m });

    t2m.forEach((ewon) => {
      const duplicate = c8y.find((element) => element.id == ewon.id);
      if (duplicate) {
        ewon.groups = duplicate.groups;
        c8y.splice(c8y.indexOf(duplicate), 1);
      }
    });

    return [...t2m, ...c8y];
  }
}
