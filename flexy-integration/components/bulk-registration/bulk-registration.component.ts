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

  poolGroupList: Map<string, string> = new Map();

  // ui
  talk2mConnected = false;
  installInProgress = false;
  installProgressText: ProgressMessage[] = [];
  installError = false;
  report = {
    failed: [],
    successfull: []
  };
  completionPercent = 0;

  private config: FlexySettings = {};
  private sessionSubscription: Subscription;

  constructor(
    private alertService: AlertService,
    private flexyService: FlexyService,
    private installAgentService: InstallAgentService,
    private modalService: BsModalService,
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

  /*
  // TODO move to action bar component
  registerManually(devices: EwonFlexyStructure[]): void {
    this.registerManuallyService.openModalRegistration().subscribe((newFlexy) => {
      newFlexy.registered = FlexyIntegrated.Integrated;
      newFlexy.talk2m_integrated = FlexyIntegrated.Not_integrated;
      console.log(newFlexy);
  reload grid
      this.rows = this.rows.concat(newFlexy);
    });
  }

  // TODO evaluate
  // register
  async register(devices: EwonFlexyStructure[]) {
    const groups = await this.flexyRegistrationService.getDeviceGroupInventoryList();

    for (const ewon of devices) {
      if (this.poolGroupList.has(ewon.pool)) continue;

      const group = groups.find((group) => group.name == ewon.pool);

      if (ewon.pool && group) {
        this.poolGroupList.set(ewon.pool, group.id);
      } else if (ewon.pool && !group) {
        const createdGroup = await this.flexyRegistrationService.createDeviceGroupInventory(ewon.pool);
        this.poolGroupList.set(ewon.pool, createdGroup.id);
      }
    }

    await this.registerSelectedDevices(devices);

    this.handleReportFeedback();
  }

  private async registerSelectedDevices(selectedItems: EwonFlexyStructure[]) {
    const promises = selectedItems.map((item) =>
      this.registerDevice(item, false)
        .then(
          () => this.report.successfull.push(item),
          () => this.report.failed.push(item)
        )
        .then(
          () =>
            (this.completionPercent =
              ((this.report.failed.length + this.report.successfull.length) / selectedItems.length) * 100)
        )
    );

    await Promise.all(promises);

    this.deviceGrid.reload();
  }

  private async registerDevice(ewon: EwonFlexyStructure, reload = true): Promise<void> {
    const poolGroupId = this.poolGroupList.get(ewon.pool);

    try {
      await this.flexyService.registerFlexy(ewon, poolGroupId);

      if (reload) this.deviceGrid.reload();
    } catch (error: any) {
      console.log('ERROR', error.data.message);
    }
  }

  private handleReportFeedback(report = this.report) {
    const details: string[] = [];
    const successfullCounter = report.successfull.length;
    const failedCounter = report.failed.length;

    if (successfullCounter) {
      report.successfull.forEach((item: EwonFlexyStructure) => {
        details.push(`${item.name} (${item.description})`);
      });

      this.alertService.success(`${successfullCounter} device successful registered`, details.join('\n'));
    }

    if (failedCounter) {
      report.successfull.forEach((item: EwonFlexyStructure) => {
        this.alertService.danger(
          `Registeration failed: ${item.name}`,
          `#${item.id}: ${item.name} (${item.description})`
        );
      });
    }
  }
  */
}
