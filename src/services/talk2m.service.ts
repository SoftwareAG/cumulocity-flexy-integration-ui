import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TALK2M_BASEURL, TALK2M_DEVELOPERID } from '@constants/flexy-integration.constants';
import { FlexyCommandFile, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';

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
export class Talk2MService {
  constructor(private http: HttpClient) {}

  private buildUrl(path: string, config: t2mUrlOptions, developerId = TALK2M_DEVELOPERID): string {
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
    return {
      headers: new HttpHeaders({ 'Content-Type': request }),
      responseType: response
    };
  }

  private async execScript(command: string, deviceName: string, config: FlexySettings): Promise<string> {
    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/ExeScriptForm`, {
      account: config.account,
      session: config.session,
      deviceUsername: config.deviceUsername,
      devicePassword: config.devicePassword,
      Command1: command
    });
    return await this.http.get<any>(url, this.generateHeaderOptions()).toPromise();
  }

  async login(account: string, username: string, password: string): Promise<HttpResponse<any>> {
    const url = this.buildUrl('login', { account, username, password });
    const response = await this.http.get<any>(url, { observe: 'response' }).toPromise();
    return response;
  }

  async logout(session: string): Promise<HttpResponse<any>> {
    return await this.http.get<any>(this.buildUrl('logout', { session }), { observe: 'response' }).toPromise();
  }

  async isSessionActive(session: string): Promise<boolean> {
    return this.getaccountinfo(session).then(
      () => true,
      () => false
    );
  }

  async getaccountinfo(session: string): Promise<HttpResponse<any>> {
    return await this.http.get<any>(this.buildUrl('getaccountinfo', { session }), { observe: 'response' }).toPromise();
  }

  async getewons(session: string, pool?: string): Promise<HttpResponse<any>> {
    const config: t2mUrlOptions = { session };
    if (pool) config.pool = pool;
    const response = await this.http.get<any>(this.buildUrl('getewons', config), { observe: 'response' }).toPromise();
    return response;
  }

  /** @deprecated use getSerial() instead */
  async getserialnumber(
    deviceName: string,
    deviceUsername: string,
    devicePassword: string,
    account: string,
    session: string
  ): Promise<string> {
    return this.getSerial(deviceName, { deviceUsername, devicePassword, account, session });
  }

  async getSerial(deviceName: string, config: FlexySettings): Promise<string> {
    const url = this.buildUrl(`get/${deviceName}/rcgi.bin/ParamForm`, {
      deviceName,
      account: config.account,
      session: config.session,
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
