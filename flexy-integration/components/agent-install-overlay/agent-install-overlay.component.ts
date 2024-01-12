import { Component, OnInit } from '@angular/core';
import { ModalLabels } from '@c8y/ngx-components';
import { InstallAgentForm } from '@flexy/models/c8y-custom-objects.model';
import { EwonFlexyStructure, FlexyConnectorRelease, FlexySettings } from '@flexy/models/flexy.model';
import { FlexyInstallProgressSteps, FlexyInstallSteps } from '@flexy/models/install.model';
import { FlexyService } from '@flexy/services';
import { Subject } from 'rxjs';

@Component({
  selector: 'agent-install-overlay',
  templateUrl: './agent-install-overlay.component.html'
})
export class AgentInstallOverlayComponent implements OnInit {
  showAdvancedOptions = false;
  closeSubject = new Subject<InstallAgentForm>();
  showPassword = false;
  showC8YPassword = false;
  loadingReleases = false;
  labels: ModalLabels = {
    ok: 'Install Agent',
    cancel: 'Cancel'
  };
  installProcessSteps: FlexyInstallProgressSteps[] = [
    {
      id: FlexyInstallSteps.REQUEST_SN,
      label: 'Reuqest Serial',
      selected: true,
      disabled: true
    },
    {
      id: FlexyInstallSteps.WAS_CONNECTED,
      label: 'Check if device was already connected via agent',
      selected: true
    },
    {
      id: FlexyInstallSteps.FILES_EXIST,
      label: 'Check for preexisting files',
      selected: true
    },
    {
      id: FlexyInstallSteps.DOWNLOAD_FILES,
      label: 'Download files',
      selected: true
    },
    {
      id: FlexyInstallSteps.CHECK_FILES_DOWNLOAD,
      label: 'Check for downloaded files',
      selected: true
    },
    {
      id: FlexyInstallSteps.REGISTER_DEVICE,
      label: 'Register device',
      selected: true
    },
    {
      id: FlexyInstallSteps.REBOOT_DEVICE,
      label: 'Reboot Device',
      selected: true
    },
    {
      id: FlexyInstallSteps.SEND_CONFIG,
      label: 'Send connection config to device',
      selected: true
    },
    {
      id: FlexyInstallSteps.ACCEPT_REGISTRATION,
      label: 'Accept device registration',
      selected: true
    }
  ];

  set devices(devices: EwonFlexyStructure[]) {
    this._devices = devices;
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

  private _devices: EwonFlexyStructure[];
  private _config: FlexySettings;

  constructor(private flexyService: FlexyService) {
    // form content init
    this._config = {
      url: {
        connector: '',
        jvmrun: '',
        cumulocity: ''
      },
      deviceUsername: '',
      devicePassword: '',
      c8yHost: '',
      c8yPort: null,
      c8yTenant: '',
      c8yUsername: '',
      c8yPassword: '',
      installProcessSkipSteps: []
    };
  }

  async ngOnInit(): Promise<void> {
    void this.fetchReleases();
  }

  async submit(): Promise<void> {
    const skipSteps = this.installProcessSteps.filter((s) => s.selected === false).map((s) => s.id);
    this.config.installProcessSkipSteps = skipSteps;

    this.closeSubject.next({ config: this.config, devices: this.devices });
  }

  dismiss(): void {
    this.closeSubject.next(null);
  }

  private async fetchReleases(): Promise<void> {
    this.loadingReleases = true;

    try {
      const releases = await this.flexyService.fetchConnectorReleases();
      let latestRelease: FlexyConnectorRelease;

      if (releases) latestRelease = releases[0];

      this._config.url = {
        connector: latestRelease.jar.download_url,
        jvmrun: latestRelease.jvmRun.download_url,
        cumulocity: latestRelease.configuration.download_url
      };
    } catch (err) {
      console.warn('Could not load release list');
    }

    this.loadingReleases = false;
  }
}
