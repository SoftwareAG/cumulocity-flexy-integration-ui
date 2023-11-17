import { Component, OnInit } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { FlexySettings } from '@flexy/models/flexy.model';
import {
  CerdentialsService,
  MicroserviceIntegrationService,
  PluginService,
  Talk2mService
} from '@flexy/services';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'plugin-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['settings.component.less']
})
export class SettingsComponent implements OnInit {
  config: FlexySettings = {};
  talk2mConnected = false;
  isMicroserviceEnabled = false;
  actionInProgress = false;

  constructor(
    private bsModalRef: BsModalRef,
    private alert: AlertService,
    private c8yMicroservice: MicroserviceIntegrationService,
    private talk2mService: Talk2mService,
    private credentialsService: CerdentialsService,
    private pluginService: PluginService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
    this.config = this.pluginService.pluginConfig;
    this.talk2mConnected = await this.talk2mService.isSessionActive();
  }

  close(): void {
    this.bsModalRef.hide();
  }

  submit(): void {
    if (this.talk2mConnected) this.logout();
    else void this.login();
  }

  async login(config = this.config): Promise<void> {
    if (!config || !config.account || !config.password || !config.tenant || !config.username) {
      this.alert.warning('Login Talk2M failed. Missing parameter.');
      return;
    }

    if (this.talk2mConnected) {
      this.alert.info('Already connected.');
      return;
    }

    this.actionInProgress = true;

    // login
    try {
      const session = await this.talk2mService.login(config.account, config.username, config.password);

      this.talk2mConnected = true;
      this.config.session = session;
      this.alert.clearAll();
      this.alert.success('Successfully established connection to Talk2M.');
      this.close();
    } catch (error: any) {
      this.alert.warning('Login Talk2M failed.', error.statusText);
    }

    // update config
    try {
      await this.credentialsService.updateCredentials(config);
    } catch (error: any) {
      this.alert.warning('Update credentials failed.', JSON.stringify(error));
    }

    this.actionInProgress = false;
  }

  async logout(): Promise<void> {
    if (!this.talk2mConnected) return;

    try {
      this.actionInProgress = true;
      await this.talk2mService.logout(this.config.session);

      this.close(); // TODO temp, prevent auto-open on logout
      this.talk2mService.session = null;
      this.talk2mConnected = false;
      this.actionInProgress = false;
      this.alert.add({ text: 'Session logout', timeout: 3000, type: 'info' });
    } catch (error: any) {
      this.alert.danger('Logout failed.', error);
    }
  }
}
