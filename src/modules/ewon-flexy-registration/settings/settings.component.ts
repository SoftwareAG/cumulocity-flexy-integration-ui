import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Alert, AlertService } from "@c8y/ngx-components";
import { Observable } from "rxjs";
// custom
import { FlexySettings } from "../../../interfaces/ewon-flexy-registration.interface";
import { Talk2MService } from "../../../services/talk2m.service";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["settings.component.less"],
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService],
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

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService
  ) {
    this.isSessionConnected = false;

  }
  
  onLogout(config?: FlexySettings) {
    if (this.isSessionConnected){
      this.talk2m.logout(config.session, config.devId).then(
        (response) => {
          this.isSessionConnected = false;
          this.alert.info("Logout current session.");
        });
    }else{
      this.alert.info("No connction established.");
    }
  }

  onConnect(config?: FlexySettings): boolean | Promise<boolean> | Observable<boolean> {
    console.log("onSubmit ", config , this._config);
    // Connect to Talk2M
    this.flexyCredentials.updateCredentials(config).then(
      () => {
        this.alert.success("Update credentials successfully.");
        if (config && config.account && config.devId && config.password && config.tenant && config.username){

          // Logout before establish new session
          if (config.session && this.isSessionConnected){
            this.talk2m.logout(config.session, config.devId).then(
              (response) => {
                this.isSessionConnected = false;
                console.log("logout ", response);
                 // Login
                this.talk2m.login(config.account, config.username, config.password, config.devId).then( 
                  (response) => {
                    this.isSessionConnected = true;
                    console.log("login ", response);
                    console.log(response.body.t2msession);
                    this.flexyCredentials.updateCredentials({"session": response.body.t2msession});
                    this.alert.success("Successfully established connection to Talk2M.");
                  }, 
                  (error) => {
                    console.log("error ", error);
                    this.alert.warning("Login Talk2M failed. Reason: " + error.statusText);
                  }
              );}
            );
          // Login
          }else{
            this.talk2m.login(config.account, config.username, config.password, config.devId).then( 
              (response) => {
                this.isSessionConnected = true;
                console.log("login ", response);
                console.log(response.body.t2msession);
                this.flexyCredentials.updateCredentials({"session": response.body.t2msession});
                this.alert.success("Successfully established connection to Talk2M.");
              }, 
              (error) => {
                console.log("error ", error);
                this.alert.warning("Login Talk2M failed. Reason: " + error.statusText);
              }
            );
          }  
        }else{
          this.alert.warning("Login Talk2M failed. Missing parameter.");
        }
      },
      (error) => {
        console.warn("Update credentials failed ", error);
        this.alert.warning("Update credentials failed. Reason: ", error.statusText)
      });
    return true;
  }

  ngOnDestroy(): void {
    console.log("ngOnDestroy");
  }

  ngOnInit(): void {
    // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(
      async (options) => {
        console.log("------------------------");
        options.forEach(option => {
          this._config[option.key] = option.value;
        });
        console.log(this._config);

        // Is session still active
        if(this._config && this._config.session && this._config.devId){
          this.isSessionConnected = await this.talk2m.isSessionActive(this._config.session, this._config.devId);
        }        
      },
      (error) => {
        this.alert.warning("Get credentials failed. Reason: ", error);
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
