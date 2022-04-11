import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TALK2M_BASEURL, TALK2M_DEVELOPERID } from '@constants/flexy-integration.constants';

@Injectable()
export class Talk2MService {
  constructor(private http: HttpClient) {}

  async login(account: string, username: string, password: string): Promise<HttpResponse<any>> {
    const url_service =
      '/login?t2maccount=' +
      account +
      '&t2musername=' +
      username +
      '&t2mpassword=' +
      password +
      '&t2mdeveloperid=' +
      TALK2M_DEVELOPERID;
    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: 'response' }).toPromise();
    return response;
  }

  async isSessionActive(session: string): Promise<boolean> {
    return this.getaccountinfo(session).then(
      () => {
        return true;
      },
      (error) => {
        return false;
      }
    );
  }

  async logout(session: string): Promise<HttpResponse<any>> {
    const url_service = '/logout?t2msession=' + session + '&t2mdeveloperid=' + TALK2M_DEVELOPERID;
    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: 'response' }).toPromise();
    return response;
  }

  async getaccountinfo(session: string): Promise<HttpResponse<any>> {
    const url_service = '/getaccountinfo?t2msession=' + session + '&t2mdeveloperid=' + TALK2M_DEVELOPERID;
    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: 'response' }).toPromise();
    return response;
  }

  async getewons(session: string, pool?: string): Promise<HttpResponse<any>> {
    let url_service = '';
    if (pool) {
      url_service = '/getewons?t2msession=' + session + '&t2mdeveloperid=' + TALK2M_DEVELOPERID + '&pool=' + pool;
    } else {
      url_service = '/getewons?t2msession=' + session + '&t2mdeveloperid=' + TALK2M_DEVELOPERID;
    }

    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: 'response' }).toPromise();
    return response;
  }

  async getserialnumber(
    device_name: string,
    device_user: string,
    device_pass: string,
    account: string,
    session: string
  ): Promise<string> {
    const url_service =
      '/get/' +
      device_name +
      '/rcgi.bin/ParamForm?AST_Param=$dtES&t2maccount=' +
      account +
      '&t2msession=' +
      session +
      '&t2mdeviceusername=' +
      device_user +
      '&t2mdevicepassword=' +
      device_pass +
      '&t2mdeveloperid=' +
      TALK2M_DEVELOPERID;

    let HTTPOptions: Object = {
      headers: new HttpHeaders({
        'Content-Type': 'text/plain'
      }),
      responseType: 'text'
    };

    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, HTTPOptions).toPromise();
    return response;
  }
}
