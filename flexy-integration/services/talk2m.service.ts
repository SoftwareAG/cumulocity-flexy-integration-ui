import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PluginConfig } from '@flexy/models/plugin.model';
import {
  Talk2MAccount,
  Talk2MUrlOptions,
  TALK2M_BASEURL,
  TALK2M_DEVELOPERID,
  Talk2mParameterParams
} from '@flexy/models/talk2m.model';
import { has } from 'lodash';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Talk2mService {
  // session (id)
  set session(session: PluginConfig['session']) {
    this._session = session;
    this.session$.next(session);
  }
  get session(): PluginConfig['session'] {
    return this._session;
  }

  set account(account: Talk2MAccount) {
    this._account = account;
    this.account$.next(account);
  }
  get account(): Talk2MAccount {
    return this._account;
  }

  // observables
  session$: BehaviorSubject<PluginConfig['session']>;

  account$: BehaviorSubject<Talk2MAccount>;

  private _session: PluginConfig['session'];

  private _account: Talk2MAccount;

  constructor(private httpClient: HttpClient) {
    this.session$ = new BehaviorSubject(this.session);
    this.account$ = new BehaviorSubject(this.account);
  }

  async login(
    account: Talk2MAccount['accountName'],
    username: Talk2MUrlOptions['username'],
    password: Talk2MUrlOptions['password']
  ): Promise<PluginConfig['session']> {
    const url = this.buildUrl('login', { account, username, password });
    const response = await this.get<any>(url, this.generateObserverHeader());
    const session =
      !!response && response.hasOwnProperty('body') && response.body.hasOwnProperty('t2msession')
        ? response.body.t2msession
        : null;

    this.session = session;

    return session;
  }

  async logout(session = this.session): Promise<HttpResponse<any>> {
    if (!session) throw Error('No session provided');

    const url = this.buildUrl('logout');
    const response = await this.get<any>(url, this.generateObserverHeader());

    this.session = null;

    return response;
  }

  async isSessionActive(session = this.session): Promise<boolean> {
    if (!session) return false;

    const account = await this.getAccount(session);

    return !!account;
  }

  async getAccount(session = this.session, useCache = true): Promise<Talk2MAccount> {
    if (!session) throw Error('No session provided');

    if (useCache && this.account) return this.account;

    try {
      const response = await this.get<any>(this.buildUrl('getaccountinfo', { session }), this.generateObserverHeader());

      this.account = response.body as Talk2MAccount;

      return this.account;
    } catch (error: any) {
      this.session = null;
      console.error(error.message);

      return null;
    }
  }

  buildUrl(
    path: string,
    config: Talk2MUrlOptions = {},
    session = this.session,
    developerId = TALK2M_DEVELOPERID
  ): string {
    let url = `/${path}`;
    const params = [];
    const keyList = {
      // TODO refactor
      session: Talk2mParameterParams.SESSION,
      account: Talk2mParameterParams.ACCOUNT,
      username: Talk2mParameterParams.USERNAME,
      password: Talk2mParameterParams.PASSWORD,
      deviceUsername: Talk2mParameterParams.DEVICE_USERNAME,
      devicePassword: Talk2mParameterParams.DEVICE_PASSWORD,
      c8yUser: 'username', // TODO move to enum
      c8yPass: 'password'
    };

    // inject parameters
    config[Talk2mParameterParams.DEVELOPER_ID] = developerId;
    if (!!session && !has(config, 'session')) config[Talk2mParameterParams.SESSION] = session;

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
    // TODO better return type
    return {
      headers: new HttpHeaders({ 'Content-Type': request }),
      responseType: response
    };
  }

  // TODO move to const or integrate with generateHeaderOptions
  generateObserverHeader() {
    return { observe: 'response' };
  }

  // TODO refactor httpClient.get usage in rest of the app
  get<T>(url: string, header = this.generateHeaderOptions()): Promise<T> {
    return this.httpClient.get<T>(url, header).toPromise();
  }
}
