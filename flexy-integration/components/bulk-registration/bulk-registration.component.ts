import { Component, ViewChild } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { InstallAgentForm, ProgressMessage } from '@flexy/models/c8y-custom-objects.model';
import { EwonFlexyStructure, FlexySettings } from '@flexy/models/flexy.model';
import {
  CerdentialsService,
  EWONFlexyDeviceRegistrationService,
  FlexyService,
  InstallAgentService,
  Talk2mService
} from '@flexy/services';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { AgentInstallOverlayComponent } from '../agent-install-overlay/agent-install-overlay.component';
import { RegistrationDeviceGridComponent } from './registration-device-grid/registration-device-grid.component';

@Component({
  selector: 'bulk-registration',
  templateUrl: './bulk-registration.component.html',
  styleUrls: ['./bulk-registration.component.less'],
  providers: [FlexyService, CerdentialsService, EWONFlexyDeviceRegistrationService]
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
    private talk2mService: Talk2mService, // private alert: AlertService,
    // private flexyRegistration: EWONFlexyDeviceRegistrationService,
    private modalService: BsModalService,
    private installAgentService: InstallAgentService,
    private alert: AlertService
    // private registerManuallyService: RegisterFlexyManualService,
    // private flexyService: FlexyService,
  )
  {
    console.clear(); // TODO remove after dev
  }

  async ngOnInit() {
    this.talk2mConnected = !!this.talk2mService.session;
    this.sessionSubscription = this.talk2mService.session$.subscribe((session) => (this.talk2mConnected = !!session));
  }

  ngOnDestroy() {
    if (this.sessionSubscription) this.sessionSubscription.unsubscribe();
  }

  showSettings() {
    // TODO
    this.alert.add({ type: 'info', text: 'Not yet implemented', timeout: 3000 });
  }

  // actions
  reboot(devices: EwonFlexyStructure[]): void {
    console.log('rebootDevices', devices);

    /*
    const reboots: Promise<string>[] = [];
    const config = { ...this.config, ...{ deviceUsername: 'adm', devicePassword: 'adm' } };

    devices.forEach((device) => reboots.push(this.flexyService.reboot(device.encodedName, config)));

    Promise.all(reboots)
      .then(() => this.alert.add({ text: `${devices.length} device(s) rebooting`, type: 'success', timeout: 3000 }))
      .catch((reason) => this.alert.danger('Reboot failed', reason));
    */
  }

  register(devices: EwonFlexyStructure[]): void {
    console.log('register', devices);

    // this.registerManuallyService.openModalRegistration().subscribe((newFlexy) => {
    //   newFlexy.registered = FlexyIntegrated.Integrated;
    //   newFlexy.talk2m_integrated = FlexyIntegrated.Not_integrated;
    //   this.rows = this.rows.concat(newFlexy);
    // });
  }

  install(devices?: EwonFlexyStructure[]): void {
    const dialog = this.modalService.show(AgentInstallOverlayComponent);

    dialog.content.devices = devices;
    dialog.content.closeSubject.subscribe((response: InstallAgentForm) => {
      if (response) this.handleInstallAgentDialog(response);
    });
  }

  // register
  // async startRegistration(devices: EwonFlexyStructure[]) {
  //   const groups = await this.flexyRegistration.getDeviceGroupInventoryList();
  //   for (const item of devices) {
  //     const ewon = this.rows.find((element) => element.id == item);
  //     if (this.poolGroupList.has(ewon.pool)) {
  //       continue;
  //     }
  //     const group = groups.find((group) => group.name == ewon.pool);
  //     if (ewon.pool && group) {
  //       this.poolGroupList.set(ewon.pool, group.id);
  //     } else if (ewon.pool && !group) {
  //       const createdGroup = await this.flexyRegistration.createDeviceGroupInventory(ewon.pool);
  //       this.poolGroupList.set(ewon.pool, createdGroup.id);
  //     }
  //   }

  //   await this.registerSelectedDevices(devices);
  //   this.deviceGrid.resetSelection();
  //   this.alert.info('Registration finished.', JSON.stringify(this.report));
  // }

  // private async registerSelectedDevices(selectedItems: string[]) {
  //   const promises = selectedItems.map((item) =>
  //     this.registerDevice(item)
  //       .then(
  //         () => this.report.successfull.push(item),
  //         () => this.report.failed.push(item)
  //       )
  //       .then(
  //         () =>
  //           (this.completionPercent =
  //             ((this.report.failed.length + this.report.successfull.length) / selectedItems.length) * 100)
  //       )
  //   );
  //   await Promise.all(promises);
  // }

  // private async registerDevice(deviceID: string): Promise<void> {
  //   let ewon = this.rows.find((element) => element.id == deviceID);
  //   const poolGroupId = this.poolGroupList.get(ewon.pool);

  //   try {
  //     ewon = await this.flexyService.registerFlexy(ewon, poolGroupId);
  //     const deviceIndex = this.rows.findIndex((element) => element.id == deviceID);
  //     this.rows[deviceIndex].registered = FlexyIntegrated.Integrated;
  //     this.rows[deviceIndex].groups = [{ name: ewon.pool, id: poolGroupId }];
  //   } catch (error) {
  //     console.log('ERROR', error); // TODO proper error handling
  //   }
  // }

  // install
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
}
