import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Talk2MUrlOptions, TALK2M_DEVELOPERID, TALK2M_BASEURL } from '@flexy/models/talk2m.model';

@Injectable()
export class Talk2mRequestService {
  constructor(private httpClient: HttpClient) {}

  buildUrl(path: string, config: Talk2MUrlOptions, developerId = TALK2M_DEVELOPERID): string {
    let url = `/${path}`;
    const params = [];
    const keyList = { // TODO refactor
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

  generateHeaderOptions(request = 'text/plain', response = 'text'): Object { // TODO return type
    return {
      headers: new HttpHeaders({ 'Content-Type': request }),
      responseType: response
    };
  }

  generateObserverHeader() {
    return { observe: 'response' };
  }

  get<T>(url: string, header = this.generateHeaderOptions()): Promise<T> {
    return this.httpClient.get<T>(url, header).toPromise();
  }
}
