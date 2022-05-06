import { IDeviceRegistration, IIdentified, IManagedObject } from '@c8y/client';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AlertService,
  BulkActionControl,
  Column,
  ColumnDataType,
  DataGridComponent,
  Pagination
} from '@c8y/ngx-components';
import { BsModalService } from 'ngx-bootstrap/modal';
//custom
import { FLEXY_EXTERNALID_TALK2M_PREFIX, EXTERNALID_TALK2M_SERIALTYPE } from '@constants/flexy-integration.constants';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';
import { InstallAgentForm, ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EWONFlexyCredentialsTenantoptionsService } from '@services/ewon-flexy-credentials-tenantoptions.service';
import { Talk2MService } from '@services/talk2m.service';
import { EWONFlexyDeviceRegistrationService } from '@services/ewon-flexy-device-registration.service';
import { RegisterFlexyManualService } from '@services/register-flexy-manual.service';
import { InstallAgentService } from '@services/install-agent.service';
import { AgentInstallOverlayComponent } from '../agent-install-overlay/agent-install-overlay.component';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  styleUrls: ['./bulk-registration.component.less'],
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService, EWONFlexyDeviceRegistrationService]
})
export class BulkRegistrationComponent implements OnInit {
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
      callback: (selected) => this.openAgentInstallOverlay(selected)
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
      icon: 'refresh',
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
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
    private flexyRegistration: EWONFlexyDeviceRegistrationService,
    private modalService: BsModalService,
    private installAgentService: InstallAgentService,
    private registerManuallyService: RegisterFlexyManualService
  ) {
    this.columns = this.getDefaultColumns();
  }

  async ngOnInit() {
    // Check already created devices in c8y with type c8y_EwonFlexy
    this.flexyRegistration.getDeviceEwonFlexyInventoryList().then(
      async (devices) => {
        for (const device of devices) {
          let ewon: EwonFlexyStructure = {} as EwonFlexyStructure;

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
          } else {
            continue;
          }
          ewon.registered = FlexyIntegrated.Integrated;
          ewon.name = device.name;
          ewon.talk2m_integrated = device.talk2m.id != '' ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
          ewon.description = device.talk2m.description ? device.talk2m.description : '';
          ewon.pool = device.talk2m.pool ? device.talk2m.pool : '';
          this.rows = this.rows.concat(ewon);
        }
        // Check credentials from tenant options
        this.flexyCredentials.getCredentials().then(
          async (options) => {
            options.forEach((option) => {
              this.config[option.key] = option.value;
            });

            // No credentials available, then stop here.
            if (Object.keys(this.config).length === 0) {
              this.alert.warning('No credentials are defined. Could not establish a connection.');
              this.isLoading = false;
              this.isSessionConnected = false;
              return;
            }

            // Is session still active
            if (this.config.session) {
              await this.talk2m.getAccountInfo(this.config.session).then(
                (result) => {
                  this.isSessionConnected = true;
                  // Are pools defined?
                  if (result.body.pools && result.body.pools.length > 0) {
                    for (const pool of result.body.pools) {
                      this.talk2m.getEwons(this.config.session, pool.id).then((response) => {
                        if (response.body.hasOwnProperty('ewons')) {
                          for (const ewon of response.body.ewons) {
                            ewon.pool = pool.name;
                            ewon.talk2m_integrated = FlexyIntegrated.Integrated;
                            const index = this.rows.indexOf(this.rows.find((element) => element.id == ewon.id));
                            if (index > -1) {
                              // remove duplicate
                              const sliced_ewon = this.rows.splice(index, 1);
                              ewon.groups = sliced_ewon[0].groups;
                            }
                            this.flexyRegistration
                              .isDeviceRegistered(ewon.id, FLEXY_EXTERNALID_TALK2M_PREFIX, EXTERNALID_TALK2M_SERIALTYPE)
                              .then((result) => {
                                ewon.registered = result ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
                              });
                          }
                          this.rows = this.rows.concat(response.body.ewons as EwonFlexyStructure[]);
                        }

                        this.isLoading = false;
                      });
                    }
                  } else {
                    this.talk2m.getEwons(this.config.session).then((response) => {
                      this.rows = response.body.ewons as EwonFlexyStructure[];
                      this.isLoading = false;
                    });
                  }
                },
                () => {
                  this.alert.warning('Session is disconnected. Please reconnect.');
                  this.isLoading = false;
                  this.isSessionConnected = false;
                }
              );
            } else {
              this.alert.info('Session is no longer active. Please re-connect.');
              this.isLoading = false;
              this.isSessionConnected = false;
            }
          },
          (error) => {
            this.alert.warning('Get credentials failed. ', error);
            this.isLoading = false;
            this.isSessionConnected = false;
          }
        );
      },
      (error) => {
        this.alert.danger('Platform is currently unavailable.', error);
      }
    );
  }

  private getDefaultColumns(): Column[] {
    return [
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        filterable: true,
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
      () => (this.installInProgress = false)
    );
  }

  private getSelectedDevices(selectedItems: string[]): EwonFlexyStructure[] {
    return this.rows.filter((d) => selectedItems.indexOf(d.id as string) > -1);
  }

  async startRegistration(selectedItems: string[]) {
    this.isRegistratingFlexy = true;

    // 0.1 Get existing device requests
    this.existingRequests = await this.flexyRegistration.getDeviceRequestRegistration();

    //0.2 Create group for pool definition
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
  }

  openRegisterModal(): void {
    this.registerManuallyService.openModalRegistration().subscribe((newFlexy) => {
      newFlexy.registered = FlexyIntegrated.Integrated;
      newFlexy.talk2m_integrated = FlexyIntegrated.Not_integrated;
      this.rows = this.rows.concat(newFlexy);
    });
  }

  openAgentInstallOverlay(selectedItems?: string[]): void {
    const dialog = this.modalService.show(AgentInstallOverlayComponent);
    dialog.content.devices = this.getSelectedDevices(selectedItems);
    dialog.content.closeSubject.subscribe((response: InstallAgentForm) => {
      if (response) this.handleInstallAgentDialog(response);
    });
  }

  // TODO remove after dev
  rebootDevices(selectedItems: string[]): void {
    const devices = this.getSelectedDevices(selectedItems);
    const reboots: Promise<string>[] = [];
    const config = { ...this.config, ...{ deviceUsername: 'adm', devicePassword: 'adm' } };

    devices.forEach((device) => reboots.push(this.talk2m.reboot(device.encodedName, config)));

    Promise.all(reboots)
      .then(() =>
        this.alert.add({ text: `${selectedItems.length} device(s) rebooting`, type: 'success', timeout: 3000 })
      )
      .catch((reason) => this.alert.danger('Reboot failed', reason));
  }
}
