import { Injectable } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { PluginConfig } from '@flexy/models/plugin.model';
import { CerdentialsService } from './credentials.service';
import { Talk2mSessionService } from './talk2m-session.service';

@Injectable({
  providedIn: 'root'
})
export class PluginService {
  pluginConfig: PluginConfig;

  constructor(
    private alertService: AlertService,
    private credentialsService: CerdentialsService,
    private talk2mSessionService: Talk2mSessionService
  ) {}

  // Check credentials from tenant options
  async checkForActiveSession(): Promise<void> {
    try {
      const credentials = await this.credentialsService.getCredentials();
      const config: Partial<PluginConfig> = {};

      credentials.forEach((c) => (config[c.key] = c.value));

      // Default tenant option
      this.pluginConfig = config as PluginConfig;

      // Is session still active
      if (config.session) {
        const isActive = await this.talk2mSessionService.isSessionActive(config.session);

        if (isActive) {
          this.talk2mSessionService.sessionID = config.session;
        } else {
          delete this.pluginConfig.session;
          this.talk2mSessionService.sessionID = null;
        }
      }
    } catch (error: any) {
      this.alertService.warning('Get credentials failed.', JSON.stringify(error.res));
    }
  }
}
