import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PluginConfig } from '@flexy/models/plugin.model';
import { Talk2MAccount, Talk2MUrlOptions } from '@flexy/models/talk2m.model';
import { BehaviorSubject } from 'rxjs';
import { Talk2mRequestService } from './talk2m-request.service';

@Injectable()
export class Talk2mSessionService {
  set sessionID(sessionID: PluginConfig['session']) {
    this._sessionID = sessionID;
    this.session$.next(sessionID);
  }
  get sessionID(): PluginConfig['session'] {
    return this._sessionID;
  }

  session$: BehaviorSubject<PluginConfig['session']>;

  private _sessionID: PluginConfig['session'];

  constructor(private httpClient: HttpClient, private talk2mRequestService: Talk2mRequestService) {
    this.session$ = new BehaviorSubject(this.sessionID);
  }

  async login(
    account: Talk2MAccount['accountName'],
    username: Talk2MUrlOptions['username'],
    password: Talk2MUrlOptions['password']
  ): Promise<PluginConfig['session']> {
    const url = this.talk2mRequestService.buildUrl('login', { account, username, password });
    const response = await this.httpClient.get<any>(url, { observe: 'response' }).toPromise();
    const session =
      !!response && response.hasOwnProperty('body') && response.body.hasOwnProperty('t2msession')
        ? response.body.t2msession
        : null;

    this.sessionID = session;

    return session;
  }

  async logout(session = this.sessionID): Promise<HttpResponse<any>> {
    if (!session) throw Error('No session provided');

    const response = await this.httpClient
      .get<any>(this.talk2mRequestService.buildUrl('logout', { session }), { observe: 'response' })
      .toPromise();

    this.sessionID = null;

    return response;
  }

  async isSessionActive(session = this.sessionID): Promise<boolean> {
    const account = await this.getAccount(session);

    return !!account;
  }

  async getAccount(session = this.sessionID): Promise<Talk2MAccount> {
    if (!session) throw Error('No session provided');

    try {
      const response = await this.httpClient
        .get<any>(this.talk2mRequestService.buildUrl('getaccountinfo', { session }), { observe: 'response' })
        .toPromise();

      return response.body as Talk2MAccount;
    } catch (error: any) {
      return error.message;
    }
  }
}
