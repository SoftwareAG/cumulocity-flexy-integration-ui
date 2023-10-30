import { Component, OnInit } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { FlexySettings } from '@flexy/models/flexy.model';
import { CerdentialsService, MicroserviceIntegrationService, Talk2mSessionService } from '@flexy/services';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['settings.component.less']
})
export class SettingsComponent implements OnInit {
  set config(config: FlexySettings) {
    this._config = config;
  }
  get config(): FlexySettings {
    return this._config;
  }

  isSessionConnected = false;
  isMicroserviceEnabled = false;

  private _config: FlexySettings = {};

  constructor(
    private alert: AlertService,
    private c8yMicroservice: MicroserviceIntegrationService,
    private talk2mSession: Talk2mSessionService,
    private credentialsService: CerdentialsService
  ) {
    if (!this.config.tenant) this.config.tenant = 'cumulocity.com';
  }

  async ngOnInit(): Promise<void> {
    this.isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
  }

  login(config: FlexySettings): boolean | Promise<boolean> | Observable<boolean> {
    if (!config || !config.account || !config.password || !config.tenant || !config.username) {
      this.alert.warning('Login Talk2M failed. Missing parameter.');
    }

    // Connect to Talk2M
    this.credentialsService.updateCredentials(config).then(
      () => {
        // Logout before establish new session
        if (config.session && this.isSessionConnected) {
          this.talk2mSession.logout(config.session).then(() => {
            this.isSessionConnected = false;
            // Login
            this.talk2mSession.login(config.account, config.username, config.password).then(
              async (session) => {
                this.isSessionConnected = true;

                this.config.session = session;
                const account = await this.talk2mSession.getAccount(this.config.session);

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
          this.talk2mSession.login(config.account, config.username, config.password).then(
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

  logout(): void {
    console.log('logout', { isSessionConnected: this.isSessionConnected, config: this.config });

    if (!this.isSessionConnected) {
      this.alert.warning('No connection established.');
      return;
    }

    this.talk2mSession.logout(this.config.session).then(
      () => {
        this.isSessionConnected = false;
        this.alert.add({ text: 'Session logout.', type: 'info', timeout: 3000 });
      },
      (error) => this.alert.danger('Logout failed.', error)
    );
  }
}
