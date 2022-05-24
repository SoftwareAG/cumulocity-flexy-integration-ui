import { Component, OnInit, ViewChild } from '@angular/core';
import { IDeviceRegistration, IIdentified, IManagedObject } from '@c8y/client';
import {
  AlertService,
  BulkActionControl,
  Column,
  ColumnDataType,
  DataGridComponent,
  Pagination
} from '@c8y/ngx-components';
import { EXTERNALID_TALK2M_SERIALTYPE, FLEXY_EXTERNALID_TALK2M_PREFIX } from '@constants/flexy-integration.constants';
import { InstallAgentForm, ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings, T2MAccount } from '@interfaces/flexy.interface';
import { CerdentialsService } from '@services/credentials.service';
import { EWONFlexyDeviceRegistrationService } from '@services/ewon-flexy-device-registration.service';
import { FlexyService } from '@services/flexy.service';
import { InstallAgentService } from '@services/install-agent.service';
import { RegisterFlexyManualService } from '@services/register-flexy-manual.service';
import { Talk2MService } from '@services/talk2m.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AgentInstallOverlayComponent } from '../agent-install-overlay/agent-install-overlay.component';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  styleUrls: ['./bulk-registration.component.less'],
  providers: [Talk2MService, CerdentialsService, EWONFlexyDeviceRegistrationService]
})
export class BulkRegistrationComponent implements OnInit {
  private devLogEnabled: boolean;
  private devLogPrefix: string;
  private config: FlexySettings = {};
  isSessionConnected = false;
  isLoading = true;
  isRegistratingFlexy = false;
  completionPercent = 0;
  poolGroupList: Map<string, string> = new Map();
  existingRequests: IDeviceRegistration[] = [];
  report = {
    failed: [],
    successfull: []
  };
  columns: Column[] = [];
  rows: EwonFlexyStructure[] = [];
  bulkActionControls: BulkActionControl[] = [
    {
      type: '',
      text: 'Install Agent',
      icon: 'download-archive',
      callback: (selected) => this.openAgentInstallModal(selected)
    },
    {
      type: '',
      text: 'Register',
      icon: 'plus-circle',
      callback: (selected) => this.startRegistration(selected)
    },
    {
      type: '',
      text: 'Reboot',
      icon: 'refresh-exception',
      callback: (selected) => this.rebootDevices(selected)
    }
  ];
  pagination: Pagination = {
    pageSize: 1000,
    currentPage: 1
  };
  installInProgress = false;
  installProgressText: ProgressMessage[] = [];
  installError = false;

  @ViewChild('grid', { static: false }) dataGrid: DataGridComponent;

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private credentialsService: CerdentialsService,
    private flexyRegistration: EWONFlexyDeviceRegistrationService,
    private modalService: BsModalService,
    private installAgentService: InstallAgentService,
    private registerManuallyService: RegisterFlexyManualService,
    private flexyService: FlexyService
  ) {
    // logging
    this.devLogEnabled = false;
    this.devLogPrefix = 'BR.C';
    // data grid config
    this.columns = this.getDefaultColumns();
  }

  ngOnInit() {
    this.devLog('OnInit');
    this.fetchContent();
  }

  // TODO move to service
  private devLog(functionName: string, args?: any): void {
    if (this.devLogEnabled !== true) return;
    console.log(`${this.devLogPrefix}|${functionName}`, args);
  }

  private getDefaultColumns(): Column[] {
    this.devLog('getDefaultColumns');
    return [
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },
      {
        name: 'online',
        header: 'ON',
        path: 'status',
        filterable: false,
        dataType: ColumnDataType.TextShort
      },
      {
        name: 'groups',
        header: 'Cumulocity Group assigned',
        path: 'groups',
        filterable: true,
        dataType: ColumnDataType.TextLong
      },
      {
        name: 'pool',
        header: 'Talk2M Pool',
        path: 'pool',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },
      {
        name: 'description',
        header: 'Talk2M Description',
        path: 'description',
        dataType: ColumnDataType.TextLong
      },
      {
        name: 'talk2m_integrated',
        header: 'Talk2M Registered',
        path: 'talk2m_integrated',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },
      {
        name: 'registered',
        header: 'Cumulocity Registered',
        path: 'registered',
        filterable: true,
        dataType: ColumnDataType.TextShort
      }
    ];
  }

  private async fetchContent(): Promise<void> {
    this.devLog('fetchContent');
    this.rows = [];
    this.isLoading = true;

    const response = await Promise.all([this.fetchDevices(), this.fetchCredentials()]);
    this.devLog('fetchContent|all', response);

    const rows = await this.digestDevices(response[0], response[1]);
    this.devLog('fetchContent|digest', rows);
    this.rows = rows;
    this.isLoading = false;
  }

  // TODO refactor
  private async fetchDeviceData(device: IManagedObject): Promise<EwonFlexyStructure> {
    this.devLog('fetchDeviceData', device);
    const ewon: EwonFlexyStructure = {};

    //request for group asset
    const groups: IManagedObject[] = await this.flexyRegistration.getGroupInventoryListOfDevice(device.id);
    ewon.groups = [];
    for (const group of groups) {
      const myGroups = {
        name: group.name,
        id: group.id
      };
      ewon.groups = ewon.groups.concat(myGroups);
    }

    const listExternalIds = await this.flexyRegistration.getExternalIdsOfManagedObject(device.id);
    if (listExternalIds.length > 0) {
      for (const externalId of listExternalIds) {
        if (externalId.type == EXTERNALID_TALK2M_SERIALTYPE) {
          const flexy_id = externalId.externalId.replace(FLEXY_EXTERNALID_TALK2M_PREFIX, '');
          ewon.id = flexy_id;
        }
      }
    }

    ewon.source = device.id;
    ewon.registered = FlexyIntegrated.Integrated;
    ewon.name = device.name;
    ewon.talk2m_integrated = device.talk2m.id != '' ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
    ewon.pool = device.talk2m.pool ? device.talk2m.pool : '';
    if (!!device.talk2m.description) ewon.description = device.talk2m.description;
    if (!!device.c8y_Agent) ewon.agent = device.c8y_Agent;

    this.devLog('fetchDeviceData|ewon', ewon);
    return ewon;
  }

  private async digestDevices(devices: EwonFlexyStructure[], account: T2MAccount): Promise<EwonFlexyStructure[]> {
    this.devLog('digestDevices', { devices, account });
    let t2mDevices: EwonFlexyStructure[];

    // fetch device t2m devices
    if (account && account.hasOwnProperty('pools') && account.pools.length) {
      t2mDevices = await this.flexyService.getEwonsOfPools(this.config.session, account.pools);
    } else {
      const response = await this.flexyService.getEwons(this.config.session);
      t2mDevices = response.body.ewons as EwonFlexyStructure[];
    }

    return this.flexyService.removeDuplicates(devices, t2mDevices);
  }

  // TODO refactor
  private async fetchCredentials(): Promise<T2MAccount> {
    this.devLog('fetchCredentials');

    try {
      // Check credentials from tenant options
      const config = await this.credentialsService.getConfig();
      if (!config) throw new Error('No Credentials defined.');
      this.config = { ...this.config, ...config };

      // session
      if (!this.config.session) throw new Error('Session is no longer active. Please re-connect.');

      // account
      const account = await this.talk2m.getAccount(this.config.session);
      this.devLog('fetchCredentials|account', account);
      if (!account) throw new Error('Could not retrieve Talk2M Account details. Please reconnect.');
      this.isSessionConnected = true; // TODO move to app service

      return account;
    } catch (error) {
      this.alert.warning('Failed to get credentials. ', error);
      this.isLoading = false;
      this.isSessionConnected = false;
    }
  }

  private async fetchDevices(): Promise<EwonFlexyStructure[]> {
    this.devLog('fetchDevices');
    const ewonPromises: Promise<EwonFlexyStructure>[] = [];
    try {
      // Check already created devices in c8y with type c8y_EwonFlexy
      const devices = await this.flexyRegistration.getDeviceEwonFlexyInventoryList();
      if (!devices) throw new Error('No devices found');

      devices.forEach((device) => ewonPromises.push(this.fetchDeviceData(device)));
      const ewons = await Promise.all(ewonPromises);
      if (!ewons || ewons.length < 1) throw new Error('could not fetch ewon data'); // TODO check feedback plausibility

      return [...ewons];
    } catch (error) {
      this.alert.danger('Platform is currently unavailable.', error); // TODO check feedback plausibility
    }
  }

  private async registerAllDevices(selectedItems: string[]) {
    // Loop through selected items to register and register them in parallel
    const promises = selectedItems.map((item) =>
      this.registerDevice(item)
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
  }

  // TODO move to service
  private async registerDevice(item: string) {
    const ewon: EwonFlexyStructure = this.rows.find((element) => element.id == item);
    const ewonId = ewon.id.toString();

    if (ewon.registered !== FlexyIntegrated.Not_integrated) {
      this.alert.info("Device with ewonId '" + ewonId + "' is already registered.");
      return;
    }

    // 1. Create device request if not exists
    const existingRequest = this.existingRequests.find(
      (element) => element.id == FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId
    );
    if (!existingRequest) {
      const registration = await this.flexyRegistration.createDeviceRequestRegistration(
        ewonId,
        FLEXY_EXTERNALID_TALK2M_PREFIX
      );
      // 1.1 Bootstraps the device credentials
      try {
        await this.flexyRegistration.requestDeviceCredentials(ewonId, FLEXY_EXTERNALID_TALK2M_PREFIX);
        // return in case we are actually able to retrieve the credentials
        return;
      } catch (error) {
        if (error && error.res && error.res.status === 404) {
          // the expected status
        } else {
          console.error('Unexpected error code.', error.res);
          throw error;
        }
      }
      // 1.2 Change status to acceptance
      await this.flexyRegistration.acceptDeviceRequest(ewonId, FLEXY_EXTERNALID_TALK2M_PREFIX);
    }

    // 2. Create inventory managed object
    const mo = await this.flexyRegistration.createDeviceInventory(ewon).catch((error) => {
      this.alert.warning('Create device invenotry failed.', error);
      throw error;
    });

    // 2.1 Change owner
    const deviceInventoryObj = await this.flexyRegistration.setDevivceOwnerExternalId(
      FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId,
      mo.id
    );

    // 3. Assign externalId to inventory
    const identityObj = await this.flexyRegistration.createIdentidyForDevice(
      deviceInventoryObj.id,
      ewonId,
      FLEXY_EXTERNALID_TALK2M_PREFIX,
      EXTERNALID_TALK2M_SERIALTYPE
    );

    // 4. Assign group to inventory
    if (ewon.pool && this.poolGroupList.has(ewon.pool)) {
      const assignedGroup: IIdentified = await this.flexyRegistration.addGroupChildAssetToDevice(
        this.poolGroupList.get(ewon.pool),
        identityObj.managedObject.id.toString()
      );
      this.rows[this.rows.findIndex((element) => element.id == item)].groups = [
        { name: ewon.pool, id: this.poolGroupList.get(ewon.pool) }
      ];
    }
    this.rows[this.rows.findIndex((element) => element.id == item)].registered = FlexyIntegrated.Integrated;
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
        this.dataGrid.cancel();
      }
    );
  }

  private getSelectedDevices(selectedItems: string[]): EwonFlexyStructure[] {
    return this.rows.filter((d) => selectedItems.indexOf(d.id as string) > -1);
  }

  async startRegistration(selectedItems: string[]) {
    this.isRegistratingFlexy = true;

    // 1 Get existing device requests
    this.existingRequests = await this.flexyRegistration.getDeviceRequestRegistration();

    // 2 Create group for pool definition
    const groups = await this.flexyRegistration.getDeviceGroupInventoryList();
    for (const item of selectedItems) {
      const ewon = this.rows.find((element) => element.id == item);
      if (this.poolGroupList.has(ewon.pool)) {
        continue;
      }
      const group = groups.find((group) => group.name == ewon.pool);
      if (ewon.pool && group) {
        this.poolGroupList.set(ewon.pool, group.id);
      } else if (ewon.pool && !group) {
        const createdGroup = await this.flexyRegistration.createDeviceGroupInventory(ewon.pool);
        this.poolGroupList.set(ewon.pool, createdGroup.id);
      }
    }

    await this.registerAllDevices(selectedItems);
    this.alert.info('Registration finished.', JSON.stringify(this.report));
    this.isRegistratingFlexy = false;
    this.dataGrid.cancel();
  }

  openRegisterModal(): void {
    this.registerManuallyService.openModalRegistration().subscribe((newFlexy) => {
      newFlexy.registered = FlexyIntegrated.Integrated;
      newFlexy.talk2m_integrated = FlexyIntegrated.Not_integrated;
      this.rows = this.rows.concat(newFlexy);
    });
  }

  openAgentInstallModal(selectedItems?: string[]): void {
    const dialog = this.modalService.show(AgentInstallOverlayComponent);
    dialog.content.devices = this.getSelectedDevices(selectedItems);
    dialog.content.closeSubject.subscribe((response: InstallAgentForm) => {
      if (response) this.handleInstallAgentDialog(response);
    });
  }

  // TODO remove after dev
  reload(): Promise<void> {
    this.devLog('reload');

    this.installInProgress = false;
    this.installProgressText = [];
    this.installError = false;

    return this.fetchContent();
  }

  // TODO remove after dev
  rebootDevices(selectedItems: string[]): void {
    const devices = this.getSelectedDevices(selectedItems);
    const reboots: Promise<string>[] = [];
    const config = { ...this.config, ...{ deviceUsername: 'adm', devicePassword: 'adm' } };

    devices.forEach((device) => reboots.push(this.flexyService.reboot(device.encodedName, config)));

    Promise.all(reboots)
      .then(() =>
        this.alert.add({ text: `${selectedItems.length} device(s) rebooting`, type: 'success', timeout: 3000 })
      )
      .catch((reason) => this.alert.danger('Reboot failed', reason));
  }
}
