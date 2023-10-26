import { Component, OnInit } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { FlexySettings } from '@interfaces/flexy.interface';
import { MicroserviceIntegrationService } from '@services/c8y-microservice-talk2m-integration.service';
import { CerdentialsService } from '@services/credentials.service';
import { Talk2MService } from '@services/talk2m.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['settings.component.less']
})
export class SettingsComponent implements OnInit {
  private _config: FlexySettings = {};
  isSessionConnected = false;
  isMicroserviceEnabled = false;

  set config(config: FlexySettings) {
    this._config = config;
  }
  get config(): FlexySettings {
    return this._config;
  }

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private credentialsService: CerdentialsService,
    private c8yMicroservice: MicroserviceIntegrationService
  ) {
  }

  ngOnInit(): void {
    this.checkMsEnabled();
    this.checkCredentials();
  }

  private async checkMsEnabled(): Promise<void> {
    this.isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
  }

  // Check credentials from tenant options
  private checkCredentials(): void {
    this.credentialsService.getCredentials().then(
      async (options) => {
        options.forEach((option) => (this.config[option.key] = option.value));

        //Default tenant option
        if (!this.config.tenant) this.config.tenant = 'cumulocity.com';

        // Is session still active
        if (this.config && this.config.session) {
          this.isSessionConnected = await this.talk2m.isSessionActive(this.config.session);
        }
      },
      (error) => this.alert.warning('Get credentials failed.', JSON.stringify(error.res))
    );
  }

  logout() {
    if (!this.isSessionConnected) {
      this.alert.warning('No connection established.');
      return;
    }

    this.talk2m.logout(this.config.session).then(
      () => {
        this.isSessionConnected = false;
        this.alert.add({ text: 'Session logout.', type: 'info', timeout: 3000 });
      },
      (error) => this.alert.danger('Logout failed.', error)
    );
  }

  connect(config: FlexySettings): boolean | Promise<boolean> | Observable<boolean> {
    if (!config || !config.account || !config.password || !config.tenant || !config.username) {
      this.alert.warning('Login Talk2M failed. Missing parameter.');
    }

    // Connect to Talk2M
    this.credentialsService.updateCredentials(config).then(
      () => {
        // Logout before establish new session
        if (config.session && this.isSessionConnected) {
          this.talk2m.logout(config.session).then(() => {
            this.isSessionConnected = false;
            // Login
            this.talk2m.login(config.account, config.username, config.password).then(
              async (session) => {
                this.isSessionConnected = true;

                this.config.session = session;
                const account = await this.talk2m.getAccount(this.config.session);

                let toUpdate = { session };
                // remove all "" after stringify
                var re = new RegExp('"', 'g');
                for (const key in account) {
                  toUpdate['talk2m.' + key] = JSON.stringify(account[key]).replace(re, '');
                }
                //update session and account info
                this.credentialsService.updateCredentials(toUpdate);
                this.alert.success('Successfully established connection to Talk2M.');
              },
              (error) => {
                this.alert.warning('[1] Login Talk2M failed.', error.statusText);
              }
            );
          });
          // Login
        } else {
          this.talk2m.login(config.account, config.username, config.password).then(
            (session) => {
              this.isSessionConnected = true;
              this.config.session = session;
              this.credentialsService.updateCredentials({ session });
              this.alert.clearAll();
              this.alert.success('Successfully established connection to Talk2M.');
            },
            (error) => {
              this.alert.warning('[1] Login Talk2M failed.', error.statusText);
            }
          );
        }
      },
      (error) => this.alert.warning('Update credentials failed. ', JSON.stringify(error))
    );
    return true;
  }
}
