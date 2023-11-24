import { Component, ViewChild } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { InstallAgentForm, ProgressMessage } from '@flexy/models/c8y-custom-objects.model';
import { EwonFlexyStructure, FlexySettings } from '@flexy/models/flexy.model';
import { FlexyService, InstallAgentService, Talk2mService } from '@flexy/services';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { AgentInstallOverlayComponent } from '../agent-install-overlay/agent-install-overlay.component';
import { RegistrationDeviceGridComponent } from './registration-device-grid/registration-device-grid.component';

@Component({
  selector: 'bulk-registration',
  templateUrl: './bulk-registration.component.html',
  styleUrls: ['./bulk-registration.component.less'],
  providers: [FlexyService]
})
export class BulkRegistrationComponent {
  @ViewChild('grid', { static: false }) deviceGrid: RegistrationDeviceGridComponent;

  // ui
  talk2mConnected = false;
  installInProgress = false;
  installProgressText: ProgressMessage[] = [];
  installError = false;

  private config: FlexySettings = {};
  private sessionSubscription: Subscription;

  constructor(
    private alertService: AlertService,
    private modalService: BsModalService,
    private flexyService: FlexyService,
    private installAgentService: InstallAgentService,
    private talk2mService: Talk2mService
  ) {}

  async ngOnInit() {
    this.talk2mConnected = !!this.talk2mService.session;
    this.sessionSubscription = this.talk2mService.session$.subscribe((session) => (this.talk2mConnected = !!session));
  }

  ngOnDestroy() {
    if (this.sessionSubscription) this.sessionSubscription.unsubscribe();
  }

  showSettings() {
    // TODO
    this.alertService.add({ type: 'info', text: 'Not yet implemented', timeout: 3000 });
  }

  // actions
  reboot(devices: EwonFlexyStructure[]): void {
    const reboots: Promise<string>[] = [];
    const config = { ...this.config, ...{ deviceUsername: 'adm', devicePassword: 'adm' } };

    devices.forEach((device) => reboots.push(this.flexyService.reboot(device.encodedName, config)));

    Promise.all(reboots)
      .then(() => {
        this.alertService.add({ text: `${devices.length} device(s) rebooting`, type: 'success', timeout: 3000 });
        this.deviceGrid.resetSelection();
      })
      .catch((reason) => this.alertService.danger('Reboot failed', reason));
  }

  install(devices?: EwonFlexyStructure[]): void {
    const dialog = this.modalService.show(AgentInstallOverlayComponent);

    dialog.content.devices = devices;
    dialog.content.closeSubject.subscribe((response: InstallAgentForm) => {
      if (response) this.handleInstallAgentDialog(response);
    });
  }

  private handleInstallAgentDialog(form: InstallAgentForm): void {
    // reset
    this.installInProgress = true;
    this.installError = false;
    this.installProgressText = [];

    this.config = { ...this.config, ...form.config };
    // TODO check for need of config in service
    this.installAgentService.install(form.devices, this.config).subscribe(
      (message) => {
        this.installProgressText.push(message);
        if (message.type === 'error') this.installError = true;
      },
      (error) => {
        this.installProgressText.push(error);
        this.installError = true;
        this.installInProgress = false;
      },
      () => {
        this.installInProgress = false;
        this.deviceGrid.resetSelection();
      }
    );
  }
}
