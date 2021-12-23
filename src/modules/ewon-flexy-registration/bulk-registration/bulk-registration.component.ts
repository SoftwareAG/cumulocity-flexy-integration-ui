import { Component, OnInit } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
import { EWONFlexyCredentialsTenantoptionsService } from '../../../services/ewon-flexy-credentials-tenantoptions.service';
import { Talk2MService } from '../../../services/talk2m.service';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService],
})
export class BulkRegistrationComponent implements OnInit {
  
  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isLoading: boolean;

  items: Array<any> = [];

  constructor( private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService) { 
    this.isSessionConnected = false;
    this.isLoading = true;
  }

  ngOnInit() {
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
          await this.talk2m.isSessionActive(this._config.session, this._config.devId).then(
            (result) => {
              this.isSessionConnected = result;
              this.talk2m.getewons(this._config.session, this._config.devId).then(
                (response) => {
                    console.log("---------------- GET EWONS");
                    console.log(response.body.ewons);
                    let ewons: [] = response.body.ewons;
                    ewons.forEach(ewon => {
                      this.items.push({"name" : ewon["name"] , "description" : ewon["description"]});
                    });
                    this.isLoading = false;
                }, (error) => {
                  this.isLoading = false;
                }
              )
            }
          );
        }        
      },
      (error) => {
        this.alert.warning("Get credentials failed. Reason: ", error);
      }
    );
  }

}
