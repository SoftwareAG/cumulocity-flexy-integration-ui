import { C8Y_MICROSERVICE_ENDPOINT, GET_OPTIONS, ONLOAD_OPTIONS, TALK2M_DEVELOPERID } from './../constants/flexy-integration.constants';
import { FetchClient, IFetchOptions, IFetchResponse, TenantService } from '@c8y/client';
import { Injectable } from "@angular/core";
import { AlertService } from '@c8y/ngx-components';



@Injectable()
export class MicroserviceIntegrationService {
  
    constructor(
        private tenantService:TenantService,
        private fetch: FetchClient,
        private alert: AlertService) {}

    async isMicroserviceEnabled(): Promise<boolean>{
        const result = await this.tenantService.current().then(
            (result) => { 
                if (result.data["applications"]){
                    const app = result.data["applications"]["references"].find(element => element.application.key == C8Y_MICROSERVICE_ENDPOINT.APPKEY)
                    return (app) ? true : false;
                }
            }
        );
        return result;
    }

    async getContextPath(): Promise<string>{
        const result = await this.tenantService.current().then(
            (result) => { 
                if (result.data["applications"]){
                    const app = result.data["applications"]["references"].find(element => element.application.key == C8Y_MICROSERVICE_ENDPOINT.APPKEY)
                    return (app) ? app.application.contextPath : null;
                }
            }
        );
        return result;
    }

    async getEwons(token:string): Promise<any>{
  
        const data = {TOKEN: token, DEVID: TALK2M_DEVELOPERID};
        //let endpoint = C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS;
        let endpoint = this.buildEndpoint( C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS, data);
        console.log("request endpoint: ", endpoint);

        const result = await this.fetch.fetch( endpoint, GET_OPTIONS ).then(
            async (response) => {
                return await response.json().then((details) => {
                    return response && details.hasOwnProperty('ewons') ? details : null;
                });
            }
        );
        console.log("c8y get ewons: ", result.ewons);

        return result.ewons;
    }

    async syncData(token:string, jobId: string, tenantId: string): Promise<any>{
        const data = {TOKEN: token, DEVID: TALK2M_DEVELOPERID, TENANTID: 't769416337'};
        let endpoint = this.buildEndpoint( C8Y_MICROSERVICE_ENDPOINT.URL.SYNC_DATA, data);
        console.log("request endpoint: ", endpoint);
    }

    async onloadNow(token:string, jobId: string, tenantId: string): Promise<IFetchResponse>{
        const data = {TOKEN: token, DEVID: TALK2M_DEVELOPERID, TENANTID: tenantId, JOBID: jobId};
        const result = await this.fetch.fetch(C8Y_MICROSERVICE_ENDPOINT.URL.ONLOAD_NOW, this.buildHeader(ONLOAD_OPTIONS.headers, token,jobId,tenantId) );

        return result;
    }

    protected buildHeader(headers: any, token: string, jobId: string, tenantId: string): any{
        const hd = JSON.stringify(headers);
        for (const key in C8Y_MICROSERVICE_ENDPOINT.VARIABLE) {
            const variable: string = C8Y_MICROSERVICE_ENDPOINT.VARIABLE[key];
            const index = hd.indexOf(variable);

            const key_header = variable.replace("{","").replace("}","");
            if (index >= 0 && hd.indexOf(key_header) >= 0 ) {
                if(variable.indexOf("token") >= 0){
                    headers[key_header] = headers[key_header].replace(variable,token);
                }else if(variable.indexOf("job") >= 0) {
                    headers[key_header] = headers[key_header].replace(variable,jobId);
                }else if(variable.indexOf("tenant") >= 0) {
                    headers[key_header] = headers[key_header].replace(variable,tenantId);
                }
              }
        }
        let options: IFetchOptions = ONLOAD_OPTIONS;
        options.headers = headers;
        console.log("header = ", options);
        return options;
    }

    protected buildEndpoint(endpoint:string, data:any): string{
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