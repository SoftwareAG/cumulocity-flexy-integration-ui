import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TALK2M_BASEURL, TALK2M_DEVELOPERID } from '@constants/flexy-integration.constants';
import { FlexyCommandFile, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';
import { DevlogService } from './devlog.service';

interface t2mUrlOptions {
  account?: string;
  password?: string;
  session?: string;
  username?: string;
  deviceUsername?: string;
  devicePassword?: string;
  [key: string]: string;
}

@Injectable({ providedIn: 'root' })
export class Talk2MService extends DevlogService {
  config: FlexySettings = {};

  constructor(private http: HttpClient) {
    super();
    this.devLogEnabled = true;
    this.devLogPrefix = 'T2M.S';
  }

  private buildUrl(path: string, config: t2mUrlOptions, developerId = TALK2M_DEVELOPERID): string {
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

  private generateHeaderOptions(request = 'text/plain', response = 'text'): Object {
    this.devLog('generateHeaderOptions', { request, response });
    return {
      headers: new HttpHeaders({ 'Content-Type': request }),
      responseType: response
    };
  }

  private async execScript(command: string, deviceName: string, config: FlexySettings): Promise<string> {
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

  async login(account: string, username: string, password: string): Promise<string> {
    this.devLog('login', { account, username, password });

    const url = this.buildUrl('login', { account, username, password });
    const response = await this.http.get<any>(url, { observe: 'response' }).toPromise();
    const session =
      !!response && response.hasOwnProperty('body') && response.body.hasOwnProperty('t2msession')
        ? response.body.t2msession
        : null;

    this.config.session = session;

    return session;
  }

  async logout(session = this.config.session): Promise<HttpResponse<any>> {
    this.devLog('logout', { session });
    return await this.http.get<any>(this.buildUrl('logout', { session }), { observe: 'response' }).toPromise();
  }

  async isSessionActive(session = this.config.session): Promise<boolean> {
    this.devLog('isSessionActive');
    return this.getAccountInfo(session).then(
      () => true,
      () => false
    );
  }

  async getAccountInfo(session = this.config.session): Promise<HttpResponse<any>> {
    this.devLog('getAccountInfo');
    return await this.http.get<any>(this.buildUrl('getaccountinfo', { session }), { observe: 'response' }).toPromise();
  }

  async getEwons(session: string, pool?: string): Promise<HttpResponse<any>> {
    this.devLog('getEwons', { pool });

    const config: t2mUrlOptions = { session: session };
    if (pool) config.pool = pool;

    return await this.http.get<any>(this.buildUrl('getewons', config), { observe: 'response' }).toPromise();
  }

  async getSerial(deviceName: string, config: FlexySettings): Promise<string> {
    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/ParamForm`, {
      session: config.session,
      deviceName,
      account: config.account,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      AST_Param: '$dtES'
    });
    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }

  async installSoftware(file: FlexyCommandFile, deviceName: string, config: FlexySettings): Promise<string> {
    return await this.execScript('GETHTTP ' + [...[file.server], ...file.files].join(','), deviceName, config);
  }

  async reboot(deviceName: string, config: FlexySettings): Promise<string> {
    return await this.execScript('REBOOT', deviceName, config);
  }
}
