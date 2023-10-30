import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject } from '@c8y/client';
import {
  EXTERNALID_TALK2M_SERIALTYPE,
  FLEXY_EXTERNALID_TALK2M_PREFIX
} from '@flexy/constants/flexy-integration.constants';
import { FlexySettings } from '@flexy/models/flexy.model';
import { DevlogService } from './devlog.service';
import { ExternalIDService } from './external-id.service';
import { Talk2mRequestService } from './talk2m-request.service';

@Injectable({ providedIn: 'root' })
export class Talk2MService extends DevlogService {
  constructor(
    private http: HttpClient,
    private externalIDService: ExternalIDService,
    private t2mRequest: Talk2mRequestService
  ) {
    super();
    // this.devLogEnabled = false;
    this.devLogPrefix = 'T2M.S';
  }

  async execScript(command: string, deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('execScript', { command, deviceName, config });
    const url = this.t2mRequest.buildUrl(`get/${deviceName}/rcgi.bin/ExeScriptForm`, {
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      Command1: command
    });

    return await this.http.get<any>(url, this.t2mRequest.generateHeaderOptions()).toPromise();
  }

  async restart(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('restart', { deviceName });

    const url = this.t2mRequest.buildUrl(`get/${deviceName}/rcgi.bin/wsdForm`, {
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_ErrorMsg: 'Reboot%20will%20occur...',
      com_Csave: 1,
      resetAction: 1,
      com_BootOp: 0
    });
    return await this.http.get<any>(url, this.t2mRequest.generateHeaderOptions()).toPromise();
  }

  async downloadFile(filename: string, deviceName: string, config): Promise<string> {
    const url = this.t2mRequest.buildUrl(`get/${deviceName}/usr/${filename}`, {
      AST_Param: '$dtIV $ftT $st_m3', // issue #27 - usage unknown
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword
    });
    return await this.http.get<any>(url, this.t2mRequest.generateHeaderOptions()).toPromise();
  }

  // new
  private getExternalIDString(id): string {
    this.devLog('getExternalIDString', { id });
    return FLEXY_EXTERNALID_TALK2M_PREFIX + id;
  }

  async getExternalID(id): Promise<IExternalIdentity> {
    this.devLog('getExternalID', { id });
    return this.externalIDService.getExternalID(this.getExternalIDString(id), EXTERNALID_TALK2M_SERIALTYPE);
  }

  async createExternalIDForDevice(deviceMO: IManagedObject, externalID: string): Promise<IExternalIdentity> {
    this.devLog('createExternalIDForDevice', { deviceMO, externalID });
    return this.externalIDService.createExternalIDForDevice(
      deviceMO.id,
      this.getExternalIDString(externalID),
      EXTERNALID_TALK2M_SERIALTYPE
    );
  }

  async sendConfig(deviceName: string, config: FlexySettings): Promise<boolean> {
    this.devLog('sendConfig', { deviceName, config });
    const url = this.t2mRequest.buildUrl(`get/${deviceName}/rcgi.bin/jvmForm`, {
      formName: 'overwriteBootstrapAuth', // 'setBootstrapAuth',
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      port: config.c8yPort,
      c8yUser: config.c8yUsername,
      c8yPass: config.c8yPassword,
      host: config.c8yHost,
      tenant: config.c8yTenant
    });

    return await this.http.get<any>(url, this.t2mRequest.generateHeaderOptions()).toPromise();
  }
}
