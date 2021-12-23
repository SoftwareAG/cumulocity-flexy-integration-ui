import { TALK2M_BASEURL } from "./../constants/flexy-integration.constants";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AlertService } from "@c8y/ngx-components";

@Injectable()
export class Talk2MService {
  
  constructor(private http: HttpClient, private alert: AlertService) {}

  async login(
    account: string,
    username: string,
    password: string,
    devId: string
  ) : Promise<HttpResponse<any> >{
    const url_service =
      "/login?t2maccount=" + account +
      "&t2musername=" + username +
      "&t2mpassword=" + password +
      "&t2mdeveloperid=" + devId;

    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: "response" }).toPromise();
    return response;

  }

  async isSessionActive(session: string, devId: string): Promise<boolean>{

    return this.getaccountinfo(session, devId).then(
      () => {
        return true;
      }, (error) => {
        return false;
      }
    );
    
  }

  async logout(session: string, devId: string) : Promise<HttpResponse<any> >{
    const url_service =
      "/logout?t2msession=" + session + "&t2mdeveloperid=" + devId;

      const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: "response" }).toPromise();
      return response;
  }

  async getaccountinfo(session: string, devId: string) : Promise<HttpResponse<any> >{
    const url_service =
      "/getaccountinfo?t2msession=" + session + "&t2mdeveloperid=" + devId;

      const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: "response" }).toPromise();
      return response;
  }

  async getewons(session: string, devId: string, pool?: string) : Promise<HttpResponse<any> > {
    let url_service = "";
    if (pool) {
        url_service =
        "/getewons?t2msession=" +
        session +
        "&t2mdeveloperid=" +
        devId +
        "&pool=" +
        pool;
      
    } else {
        url_service =
        "/getewons?t2msession=" + session + "&t2mdeveloperid=" + devId;
    }

    const response = await this.http.get<any>(TALK2M_BASEURL + url_service, { observe: "response" }).toPromise();
    return response;
  }
}
