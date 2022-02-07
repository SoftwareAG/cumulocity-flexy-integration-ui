import { MicroserviceIntegrationService } from './../../../services/c8y-microservice-talk2m-integration.service';
import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Alert, AlertService } from "@c8y/ngx-components";
import { Observable } from "rxjs";
// custom
import { FlexySettings } from "../../../interfaces/ewon-flexy-registration.interface";
import { Talk2MService } from "../../../services/talk2m.service";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";
import { TALK2M_DEVELOPERID } from "../../../constants/flexy-integration.constants";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["settings.component.less"],
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService, MicroserviceIntegrationService],
})
export class SettingsComponent implements OnInit, OnDestroy {
  @Input() set config(value: any) {
    console.log("set config", value);
    this._config = value;
  }
  get config(): any {
    return this._config;
  }

  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isMicroserviceEnabled: boolean;

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
    private c8yMicroservice: MicroserviceIntegrationService
  ) {
    this.isSessionConnected = false;
    this.isMicroserviceEnabled = false;

  }
  
  onLogout(config?: FlexySettings) {
    if (this.isSessionConnected){
      this.talk2m.logout(this._config.session).then(
        (response) => {
          console.log("logout ", response);
          this.isSessionConnected = false;
          this.alert.info("Session logout.");
        }, (error)=>{
          this.alert.info("Logout failed.", error);
          console.log("logout ", error);
        });
    }else{
      
      this.alert.info("No connction established.");
    }
  }

  onConnect(config?: FlexySettings): boolean | Promise<boolean> | Observable<boolean> {
 
    if (config && config.account  && config.password && config.tenant && config.username /*&& config.token*/){
      // Connect to Talk2M
      this.flexyCredentials.updateCredentials(config).then(
      () => {
          // Logout before establish new session
          if (config.session && this.isSessionConnected){
            this.talk2m.logout(config.session).then(
              (response) => {
                this.isSessionConnected = false;
                console.log("logout ", response);
                 // Login
                this.talk2m.login(config.account, config.username, config.password).then( 
                  async (response) => {
                    this.isSessionConnected = true;
                    this.alert.success("Successfully established connection to Talk2M.");
                    
                    this._config.session = response.body.t2msession;
                    const accountInfo = await this.talk2m.getaccountinfo(this._config.session);

                    let toUpdate = {session : response.body.t2msession};
                    // remove all "" after stringify
                    var re = new RegExp("\"", 'g');
                    for (const key in accountInfo.body) {
                      toUpdate["talk2m." + key] = JSON.stringify(accountInfo.body[key]).replace(re,"");
                    }
                    //update session and account info
                    this.flexyCredentials.updateCredentials(toUpdate);
                    this.alert.success("Update credentials successfully.");
                  }, 
                  (error) => {
                    console.log("error ", error);
                    this.alert.warning("Login Talk2M failed. Reason: " + error.statusText);
                  }
              );}
            );
          // Login
          }else{
            this.talk2m.login(config.account, config.username, config.password).then( 
              (response) => {
                this.isSessionConnected = true;
                this._config.session = response.body.t2msession;
                this.flexyCredentials.updateCredentials({"session": response.body.t2msession});
                this.alert.success("Successfully established connection to Talk2M.");
              }, 
              (error) => {
                console.log("error ", error);
                this.alert.warning("Login Talk2M failed. Reason: " + error.statusText);
              }
            );
          }  
      },
      (error) => {
        console.warn("Update credentials failed ", error);
        this.alert.warning("Update credentials failed. ", JSON.stringify(error))
      });
    return true;
    }else{
      this.alert.warning("Login Talk2M failed. Missing parameter.");
    }
  }

  ngOnDestroy(): void {
    console.log("ngOnDestroy");
  }

  async ngOnInit() {
    // Is Microservice enabled?
    this.isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
    // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(
      async (options) => {
        console.log("------------------------");
        console.log("tenant credentials = ", options);
        options.forEach(option => {
          this._config[option.key] = option.value;
        });
        console.log(this._config);

        //Default tenant option
        if( !this._config.tenant){
          this._config.tenant = "cumulocity.com"
        }

        // Is session still active
        if(this._config && this._config.session){
          this.isSessionConnected = await this.talk2m.isSessionActive(this._config.session);
        }        
      },
      (error) => {
        this.alert.warning("Get credentials failed.", JSON.stringify(error.res));
      }
    );
  }

  createAlert(text: string, type: Alert["type"]): void {
    const alert: Alert = {
      text,
      type,
      timeout: 5000,
    };
    this.alert.add(alert);
  }
}
