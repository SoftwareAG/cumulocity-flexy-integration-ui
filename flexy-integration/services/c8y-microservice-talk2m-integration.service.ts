import { Injectable } from '@angular/core';
import { FetchClient, IFetchOptions, IFetchResponse, TenantService } from '@c8y/client';
import {
  C8Y_MICROSERVICE_ENDPOINT,
  CHECKFILES_OPTIONS,
  GET_OPTIONS,
  ONLOAD_OPTIONS
} from '@flexy/constants/flexy-integration.constants';
import { TALK2M_DEVELOPERID } from '@flexy/models/talk2m.model';

@Injectable({ providedIn: 'root' })
export class MicroserviceIntegrationService {
  constructor(private tenantService: TenantService, private fetch: FetchClient) {}

  async isMicroserviceEnabled(): Promise<boolean> {
    //
    const result = await this.tenantService.current().then((result) => {
      if (result.data['applications']) {
        const app = result.data['applications']['references'].find(
          (element) => element.application.key == C8Y_MICROSERVICE_ENDPOINT.APPKEY
        );
        return app ? true : false;
      }
      return null;
    });
    return result;
  }

  async getContextPath(): Promise<string> {
    const result = await this.tenantService.current().then((result) => {
      if (result.data['applications']) {
        const app = result.data['applications']['references'].find(
          (element) => element.application.key == C8Y_MICROSERVICE_ENDPOINT.APPKEY
        );
        return app ? app.application.contextPath : null;
      }
      return null;
    });
    return result;
  }

  async getEwons(token: string): Promise<any> {
    const data = { TOKEN: token, DEVID: TALK2M_DEVELOPERID };
    //let endpoint = C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS;
    let endpoint = this.buildEndpoint(C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS, data);

    const result = await this.fetch.fetch(endpoint, GET_OPTIONS).then(async (response) => {
      return await response.json().then((details) => {
        return response && details.hasOwnProperty('ewons') ? details : null;
      });
    });

    return result.ewons;
  }

  async onloadNow(token: string, jobId: string, tenantId: string): Promise<IFetchResponse> {
    const result = await this.fetch.fetch(
      C8Y_MICROSERVICE_ENDPOINT.URL.ONLOAD_NOW,
      this.buildHeader(ONLOAD_OPTIONS.headers, token, jobId, tenantId)
    );

    return result;
  }

  async checkFiles(filesUrl: string): Promise<boolean> {
    const result = await this.fetch.fetch(
      C8Y_MICROSERVICE_ENDPOINT.URL.CHECK_FILES,
      this.buildHeadersForCheckFile(CHECKFILES_OPTIONS.headers, filesUrl)
    );

    return result
      .json()
      .then((body) => (result.status === 200 ? (body as boolean) : Promise.reject('Microservice not available')));
  }

  protected buildHeadersForCheckFile(headers: any, filesUrl: string): any {
    const hd = JSON.stringify(headers);
    const variable: string = C8Y_MICROSERVICE_ENDPOINT.VARIABLE['FILESURL'];
    const index = hd.indexOf(variable);
    const key_header = variable.replace('{', '').replace('}', '');

    if (index >= 0 && hd.indexOf(key_header) >= 0) {
      if (variable.indexOf('filesUrl') >= 0) {
        headers[key_header] = headers[key_header].replace(variable, filesUrl);
      }
    }

    let options: IFetchOptions = CHECKFILES_OPTIONS;

    options.headers = headers;
    return options;
  }

  protected buildHeader(headers: any, token: string, jobId: string, tenantId: string): any {
    const hd = JSON.stringify(headers);
    for (const key in C8Y_MICROSERVICE_ENDPOINT.VARIABLE) {
      const variable: string = C8Y_MICROSERVICE_ENDPOINT.VARIABLE[key];
      const index = hd.indexOf(variable);

      const key_header = variable.replace('{', '').replace('}', '');
      if (index >= 0 && hd.indexOf(key_header) >= 0) {
        if (variable.indexOf('token') >= 0) {
          headers[key_header] = headers[key_header].replace(variable, token);
        } else if (variable.indexOf('job') >= 0) {
          headers[key_header] = headers[key_header].replace(variable, jobId);
        } else if (variable.indexOf('tenant') >= 0) {
          headers[key_header] = headers[key_header].replace(variable, tenantId);
        }
      }
    }
    let options: IFetchOptions = ONLOAD_OPTIONS;
    options.headers = headers;
    return options;
  }

  protected buildEndpoint(endpoint: string, data: any): string {
    const ep = endpoint;
    for (const key in C8Y_MICROSERVICE_ENDPOINT.VARIABLE) {
      const variable = C8Y_MICROSERVICE_ENDPOINT.VARIABLE[key];
      const index = ep.indexOf(variable);

      if (index >= 0 && data.hasOwnProperty(key)) {
        endpoint = endpoint.replace(variable, data[key]);
      }
    }

    return endpoint;
  }
}
