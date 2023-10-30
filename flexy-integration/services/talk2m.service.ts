import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject } from '@c8y/client';
import {
  EXTERNALID_TALK2M_SERIALTYPE,
  FLEXY_EXTERNALID_TALK2M_PREFIX
} from '@flexy/constants/flexy-integration.constants';
import { FlexySettings } from '@flexy/models/flexy.model';
import { T2MAccount, T2MUrlOptions, TALK2M_BASEURL, TALK2M_DEVELOPERID } from '@flexy/models/talk-2-m.model';
import { BehaviorSubject } from 'rxjs';
import { DevlogService } from './devlog.service';
import { ExternalIDService } from './external-id.service';

@Injectable({ providedIn: 'root' })
export class Talk2MService extends DevlogService {
  session$: BehaviorSubject<string>;

  set sessionID(sessionID: string) {
    this._sessionID = sessionID;
    this.session$.next(sessionID);
  }
  get sessionID(): string {
    return this._sessionID;
  }

  private _sessionID: string;

  constructor(private http: HttpClient, private externalIDService: ExternalIDService) {
    super();
    // this.devLogEnabled = false;
    this.devLogPrefix = 'T2M.S';

    this.session$ = new BehaviorSubject(this.sessionID);
  }

  buildUrl(path: string, config: T2MUrlOptions, developerId = TALK2M_DEVELOPERID): string {
    this.devLog('buildUrl', { path, config, developerId });
    let url = `/${path}`;
    const params = [];
    const keyList = {
      developerId: 't2mdeveloperid',
      account: 't2maccount',
      username: 't2musername',
      password: 't2mpassword',
      session: 't2msession',
      deviceUsername: 't2mdeviceusername',
      devicePassword: 't2mdevicepassword',
      c8yUser: 'username',
      c8yPass: 'password'
    };

    config = { ...{ developerId }, ...config };

    Object.keys(config).forEach((key) => {
      if (keyList.hasOwnProperty(key)) params.push(`${keyList[key]}=${config[key]}`);
      else params.push(`${key}=${config[key]}`);
    });

    if (params.length) {
      url += '?' + params.join('&');
    }

    return TALK2M_BASEURL + url;
  }

  generateHeaderOptions(request = 'text/plain', response = 'text'): Object {
    this.devLog('generateHeaderOptions', { request, response });
    return {
      headers: new HttpHeaders({ 'Content-Type': request }),
      responseType: response
    };
  }

  async execScript(command: string, deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('execScript', { command, deviceName, config });
    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/ExeScriptForm`, {
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      Command1: command
    });
    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }

  async restart(deviceName: string, config: FlexySettings): Promise<string> {
    this.devLog('restart', { deviceName });

    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/wsdForm`, {
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_ErrorMsg: 'Reboot%20will%20occur...',
      com_Csave: 1,
      resetAction: 1,
      com_BootOp: 0
    });
    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }

  async downloadFile(filename: string, deviceName: string, config): Promise<string> {
    const url = this.buildUrl(`get/${deviceName}/usr/${filename}`, {
      AST_Param: '$dtIV $ftT $st_m3', // issue #27 - usage unknown
      session: config.session,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword
    });
    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }

  async login(account: string, username: string, password: string): Promise<string> {
    this.devLog('login', { account, username, password });

    const url = this.buildUrl('login', { account, username, password });
    const response = await this.http.get<any>(url, { observe: 'response' }).toPromise();

    const session = !!response && response.hasOwnProperty('body') && response.body.hasOwnProperty('t2msession')
        ? response.body.t2msession
      : null;

    this.sessionID = session;

    return session;
  }

  async logout(session: string): Promise<HttpResponse<any>> {
    this.devLog('logout', { session });
    const response = await this.http.get<any>(this.buildUrl('logout', { session }), { observe: 'response' }).toPromise();
    this.sessionID = null;

    return response;
  }

  async isSessionActive(session: string): Promise<boolean> {
    this.devLog('isSessionActive');
    return this.getAccount(session).then(
      () => true,
      () => false
    );
  }

  async getAccount(session: string): Promise<T2MAccount> {
    this.devLog('getAccount');

    try {
      const response = await this.http
        .get<any>(this.buildUrl('getaccountinfo', { session }), { observe: 'response' })
        .toPromise();
      this.devLog('getAccount|response', response);
      return response.body as T2MAccount;
    } catch (error) {
      // return Promise.reject(error.message); // TODO check
      return Promise.reject(error);
    }
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
    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/jvmForm`, {
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

    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }
}
