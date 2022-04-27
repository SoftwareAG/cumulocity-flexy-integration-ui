import { Component } from '@angular/core';
import { ModalLabels } from '@c8y/ngx-components';
import { Subject } from 'rxjs';
import * as _ from 'lodash';
import { InstallAgentForm } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';

@Component({
  selector: 'agent-install-overlay',
  templateUrl: './agent-install-overlay.component.html'
})
export class AgentInstallOverlayComponent {
  private _devices: EwonFlexyStructure[];
  private _config: FlexySettings;
  closeSubject = new Subject<InstallAgentForm>();
  labels: ModalLabels = {
    ok: 'Install Agent',
    cancel: 'Cancel'
  };
  showPassword = false;

  set devices(devices: EwonFlexyStructure[]) {
    // TODO check filter
    this._devices = devices.filter((d) => d.talk2m_integrated === FlexyIntegrated.Integrated && d.status === 'online');
  }
  get devices(): EwonFlexyStructure[] {
    return this._devices;
  }

  set config(config: FlexySettings) {
    this._config = config;
  }
  get config(): FlexySettings {
    return this._config;
  }

  constructor() {
    // form content init
    this._config = {
      url: {
        connector: '',
        jvmrun: '',
        cumulocity: ''
      },
      deviceUsername: '',
      devicePassword: ''
    };
    // TODO remove after dev
    this._config.url = {
      connector:
        'https://github.com/hms-networks/flexy-cumulocity-connector/releases/download/v1.1.0/flexy-cumulocity-connector-1.1.0-full.jar',
      jvmrun: 'https://github.com/hms-networks/flexy-cumulocity-connector/releases/download/v1.1.0/jvmrun',
      cumulocity: 'https://my.server/path/CumulocityConnectorConfig.json'
    };
    this._config.deviceUsername = 'adm'; // TODO remove after dev
    this._config.devicePassword = 'adm'; // TODO remove after dev
  }

  submit(): void {
    this.closeSubject.next({ config: this.config, devices: this.devices });
  }

  dismiss(): void {
    this.closeSubject.next(null);
  }
}
