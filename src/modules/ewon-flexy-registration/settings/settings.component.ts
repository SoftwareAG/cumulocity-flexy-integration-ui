import { MicroserviceIntegrationService } from './../../../services/c8y-microservice-talk2m-integration.service';
import { Component, OnInit } from '@angular/core';
import { Alert, AlertService } from '@c8y/ngx-components';
import { Observable } from 'rxjs';
import { FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
import { Talk2MService } from '../../../services/talk2m.service';
import { EWONFlexyCredentialsTenantoptionsService } from '../../../services/ewon-flexy-credentials-tenantoptions.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['settings.component.less'],
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService, MicroserviceIntegrationService]
})
export class SettingsComponent implements OnInit {
  private _config: FlexySettings = {};
  isSessionConnected: boolean;
  isMicroserviceEnabled: boolean;
  set config(config: FlexySettings) {
    this._config = config;
  }
  get config(): FlexySettings {
    return this._config;
  }

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
    private c8yMicroservice: MicroserviceIntegrationService
  ) {
    this.isSessionConnected = false;
    this.isMicroserviceEnabled = false;

    // TODO remove after dev
    this._config.account = 'SAG-IoT';
    this._config.username = 'admin';
    this._config.password = 's%3GXLnX6L';
  }

  async ngOnInit(): Promise<void> {
    // Is Microservice enabled?
    this.isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
    // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(
      async (options) => {
        options.forEach((option) => {
          this.config[option.key] = option.value;
        });

        //Default tenant option
        if (!this.config.tenant) {
          this.config.tenant = 'cumulocity.com';
        }

        // Is session still active
        if (this.config && this.config.session) {
          this.isSessionConnected = await this.talk2m.isSessionActive(this.config.session);
        }
      },
      (error) => {
        this.alert.warning('Get credentials failed.', JSON.stringify(error.res));
      }
    );
  }

  onLogout() {
    if (!this.isSessionConnected) {
      this.alert.info('No connection established.');
      return;
    }

    this.talk2m.logout(this.config.session).then(
      (response) => {
        this.isSessionConnected = false;
        this.alert.info('Session logout.');
      },
      (error) => {
        this.alert.info('Logout failed.', error);
      }
    );
  }

  onConnect(config?: FlexySettings): boolean | Promise<boolean> | Observable<boolean> {
    if (!config || !config.account || !config.password || !config.tenant || !config.username /*&& config.token*/) {
      this.alert.warning('Login Talk2M failed. Missing parameter.');
    }
    // Connect to Talk2M
    this.flexyCredentials.updateCredentials(config).then(
      () => {
        // Logout before establish new session
        if (config.session && this.isSessionConnected) {
          this.talk2m.logout(config.session).then((response) => {
            this.isSessionConnected = false;
            // Login
            this.talk2m.login(config.account, config.username, config.password).then(
              async (response) => {
                this.isSessionConnected = true;
                this.alert.success('Successfully established connection to Talk2M.');

                this.config.session = response.body.t2msession;
                const accountInfo = await this.talk2m.getaccountinfo(this.config.session);

                let toUpdate = { session: response.body.t2msession };
                // remove all "" after stringify
                var re = new RegExp('"', 'g');
                for (const key in accountInfo.body) {
                  toUpdate['talk2m.' + key] = JSON.stringify(accountInfo.body[key]).replace(re, '');
                }
                //update session and account info
                this.flexyCredentials.updateCredentials(toUpdate);
                this.alert.success('Update credentials successfully.');
              },
              (error) => {
                this.alert.warning('Login Talk2M failed. Reason: ' + error.statusText);
              }
            );
          });
          // Login
        } else {
          this.talk2m.login(config.account, config.username, config.password).then(
            (response) => {
              this.isSessionConnected = true;
              this.config.session = response.body.t2msession;
              this.flexyCredentials.updateCredentials({
                session: response.body.t2msession
              });
              this.alert.success('Successfully established connection to Talk2M.');
            },
            (error) => {
              this.alert.warning('Login Talk2M failed. Reason: ' + error.statusText);
            }
          );
        }
      },
      (error) => {
        console.warn('Update credentials failed ', error);
        this.alert.warning('Update credentials failed. ', JSON.stringify(error));
      }
    );
    return true;
  }

  createAlert(text: string, type: Alert['type']): void {
    const alert: Alert = {
      text,
      type,
      timeout: 5000
    };
    this.alert.add(alert);
  }
}
