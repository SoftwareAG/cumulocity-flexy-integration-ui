import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { DeviceRegistrationService, IDeviceRegistration, IManagedObject } from '@c8y/client';
import { AlertService, BulkActionControl, Column, DataGridComponent, Pagination, Row } from '@c8y/ngx-components';
import {
  EXTERNALID_TALK2M_SERIALTYPE,
  FLEXY_EXTERNALID_TALK2M_PREFIX
} from '@flexy/constants/flexy-integration.constants';
import { FLEXY_GRID_COLUMNS, FLEXY_GRID_PAGINATION } from '@flexy/models/flexy-grid.model';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '@flexy/models/flexy.model';
import { Talk2MAccount } from '@flexy/models/talk2m.model';
import { EWONFlexyDeviceRegistrationService, FlexyService, Talk2mService } from '@flexy/services';
import { has } from 'lodash';

@Component({
  selector: 'registration-device-grid',
  templateUrl: './registration-device-grid.component.html',
  styleUrls: ['./registration-device-grid.component.less']
})
export class RegistrationDeviceGridComponent implements OnInit {
  // in & out
  @Output() onInstall = new EventEmitter<EwonFlexyStructure[]>();
  @Output() onRegister = new EventEmitter<EwonFlexyStructure[]>();
  @Output() onReboot = new EventEmitter<EwonFlexyStructure[]>();

  // from template
  @ViewChild('grid', { static: false }) set dataGrid(grid: DataGridComponent) {
    this._dataGrid = grid;
    if (grid) this._dataGrid.reload = () => this.reload();
  }
  get dataGrid(): DataGridComponent {
    return this._dataGrid;
  }

  // ui
  isLoading = true;

  // grid
  rows: Row[] = [];
  columns: Column[] = FLEXY_GRID_COLUMNS;
  pagination: Pagination = FLEXY_GRID_PAGINATION;
  bulkActionControls: BulkActionControl[] = [
    {
      type: 'INSTALL',
      text: 'Install Agent',
      icon: 'download-archive',
      callback: (selected) => this.onInstall.emit(this.getSelectedDevices(selected))
    },
    {
      type: 'REBOOT',
      text: 'Reboot',
      icon: 'refresh-exception',
      callback: (selected) => this.onReboot.emit(this.getSelectedDevices(selected))
    }
  ];

  private _dataGrid: DataGridComponent;
  private account: Talk2MAccount;
  private session: FlexySettings['session'];

  constructor(
    private alertService: AlertService,
    private deviceRegistrationService: DeviceRegistrationService,
    private flexyRegistration: EWONFlexyDeviceRegistrationService,
    private flexyService: FlexyService,
    private talk2mService: Talk2mService
  ) {}

  async ngOnInit(): Promise<void> {
    this.session = this.talk2mService.session;
    this.account = await this.talk2mService.getAccount();
    await this.fetchContent();
  }

  async reload(): Promise<void> {
    await this.fetchContent();
  }

  resetSelection() {
    this.dataGrid.cancel();
  }

  // load devices
  private async fetchContent(): Promise<void> {
    this.rows = [];
    this.isLoading = true;

    const [cumulocityDevices, talk2mDevices, openRegistrations] = await Promise.all([
      this.fetchCumulocityDevices(),
      this.fetchTalk2mDevices(),
      this.deviceRegistrationService.list()
    ]);

    this.rows = this.attachRegistrationData(
      this.removeDuplicateDevices(await this.digestCumulocityDevices(cumulocityDevices), talk2mDevices),
      openRegistrations.data
    ) as Row[];

    this.isLoading = false;
  }

  private async fetchCumulocityDevices(): Promise<IManagedObject[]> {
    // get already created devices in c8y with type c8y_EwonFlexy
    try {
      return await this.flexyRegistration.getDeviceEwonFlexyInventoryList();
    } catch (error: any) {
      this.alertService.warning('Could not load cumulocity registered devices.');
      return [];
    }
  }

  private async digestCumulocityDevices(devices: IManagedObject[]): Promise<EwonFlexyStructure[]> {
    const ewonPromises: Promise<EwonFlexyStructure>[] = [];
    let ewons: EwonFlexyStructure[];

    // add data from talk2m
    try {
      devices.forEach((device) => ewonPromises.push(this.fetchTalk2mDeviceData(device)));
      ewons = await Promise.all(ewonPromises);
    } catch (error: any) {
      this.alertService.danger('Could not load Talk2M connected devices.', error as string);
      return [];
    }

    return ewons;
  }

  private async fetchTalk2mDevices(account = this.account): Promise<EwonFlexyStructure[]> {
    if (!account) return [];

    return account && has(account, 'pools') && account.pools.length
      ? await this.flexyService.getEwonsOfPools(account.pools)
      : ((await this.flexyService.getEwons(this.session)).body.ewons as EwonFlexyStructure[]);
  }

  private removeDuplicateDevices(c8y: EwonFlexyStructure[], talk2m: EwonFlexyStructure[]): EwonFlexyStructure[] {
    const uniques = talk2m.map((ewon) => {
      const duplicate = c8y.find((element) => element.id == ewon.id);
      if (duplicate) {
        c8y.splice(c8y.indexOf(duplicate), 1);
        return { ...duplicate, ...ewon };
      }
      return ewon;
    });

    return [...c8y, ...uniques];
  }

  private attachRegistrationData(
    devices: EwonFlexyStructure[],
    registrations: IDeviceRegistration[]
  ): EwonFlexyStructure[] {
    if (!registrations.length) return devices;

    // add pending device registration id
    registrations.forEach((r) => {
      const d = devices.find((d) => r.customProperties.talk2m === d.id);

      if (!!d) d.c8yRegistration = r;
    });

    return devices;
  }

  // TODO refactor
  private async fetchTalk2mDeviceData(device: IManagedObject): Promise<EwonFlexyStructure> {
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

    return ewon;
  }

  private getSelectedDevices(selectedItems: string[]): EwonFlexyStructure[] {
    return this.rows.filter((d) => selectedItems.indexOf(d.id as string) > -1);
  }
}
