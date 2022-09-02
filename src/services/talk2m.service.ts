import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TALK2M_BASEURL, TALK2M_DEVELOPERID } from '@constants/flexy-integration.constants';
import { FlexySettings, T2MAccount, t2mUrlOptions } from '@interfaces/flexy.interface';
import { DevlogService } from './devlog.service';

@Injectable({ providedIn: 'root' })
export class Talk2MService extends DevlogService {
  constructor(private http: HttpClient) {
    super();
    this.devLogEnabled = false;
    this.devLogPrefix = 'T2M.S';
  }

  buildUrl(path: string, config: t2mUrlOptions, developerId = TALK2M_DEVELOPERID): string {
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
      devicePassword: 't2mdevicepassword'
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

  async downloadFile(filename: string, deviceName: string, config): Promise<string> {
    const url = this.buildUrl(`get/${deviceName}/usr/${filename}`, {
      AST_Param: '$dtIV$ftT', // issue #27 - usage unknown
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
    const session =
      !!response && response.hasOwnProperty('body') && response.body.hasOwnProperty('t2msession')
        ? response.body.t2msession
        : null;

    return session;
  }

  async logout(session: string): Promise<HttpResponse<any>> {
    this.devLog('logout', { session });
    return await this.http.get<any>(this.buildUrl('logout', { session }), { observe: 'response' }).toPromise();
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
    const response = await this.http
      .get<any>(this.buildUrl('getaccountinfo', { session }), { observe: 'response' })
      .toPromise();
    this.devLog('getAccount|response', response);
    return response.body as T2MAccount;
  }
}
