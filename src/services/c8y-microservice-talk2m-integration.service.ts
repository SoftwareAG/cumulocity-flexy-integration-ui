import { C8Y_MICROSERVICE_ENDPOINT, GET_OPTIONS } from './../constants/flexy-integration.constants';
import { FetchClient, TenantService } from '@c8y/client';
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

    async getEwons(token:string, devId: string): Promise<any>{

        let endpoint = C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS;
        const data = {TOKEN: token, DEVID: devId};

        for (const key in C8Y_MICROSERVICE_ENDPOINT.VARIABLE) {
            const variable = C8Y_MICROSERVICE_ENDPOINT.VARIABLE[key];
            const index = C8Y_MICROSERVICE_ENDPOINT.URL.GET_EWONS.indexOf(variable);
      
            if (index >= 0 && data.hasOwnProperty(key)) {
              endpoint = endpoint.replace(variable, data[key]);
            }
          }
    
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
}