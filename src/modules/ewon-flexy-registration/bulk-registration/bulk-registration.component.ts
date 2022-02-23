import { IDeviceRegistration, IManagedObject } from "@c8y/client";
import { Component, OnInit } from "@angular/core";
import {
  ActionControl,
  AlertService,
  Column,
  ColumnDataType,
  Pagination,
} from "@c8y/ngx-components";
//custom
import {
  EwonFlexyStructure,
  FlexyIntegrated,
  FlexySettings,
} from "../../../interfaces/ewon-flexy-registration.interface";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";
import { Talk2MService } from "../../../services/talk2m.service";
import { EWONFlexyDeviceRegistrationService } from "../../../services/ewon-flexy-device-registration.service";
import {
  FLEXY_EXTERNALID_TALK2M_PREFIX,
  EXTERNALID_TALK2M_SERIALTYPE,
} from "./../../../constants/flexy-integration.constants";
import { RegisterFlexyManualService } from "../../../services/register-flexy-manual.service";

@Component({
  selector: "app-bulk-registration",
  templateUrl: "./bulk-registration.component.html",
  providers: [
    Talk2MService,
    EWONFlexyCredentialsTenantoptionsService,
    EWONFlexyDeviceRegistrationService,
  ],
})
export class BulkRegistrationComponent implements OnInit {
  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isLoading: boolean;
  public isRegistratingFlexy: boolean;

  public completionPercent: number;
  public selectedItems: Array<number>;
  public poolGroupList: Map<string, string>;
  public existingRequests: IDeviceRegistration[];

  public report = {
    failed: [],
    successfull: [],
  };

  columns: Column[] = [];
  rows: EwonFlexyStructure[] = [];

  actionControls: ActionControl[] = [];
  pagination: Pagination = {
    pageSize: 1000,
    currentPage: 1,
  };

  constructor(
    private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
    private flexyRegistration: EWONFlexyDeviceRegistrationService,
    public registerManuallyService: RegisterFlexyManualService
  ) {
    this.isSessionConnected = false;
    this.isLoading = true;
    this.isRegistratingFlexy = false;

    this.poolGroupList = new Map();
    this.existingRequests = [];
    this.completionPercent = 0;
    this.columns = this.getDefaultColumns();
    this.selectedItems = [];
  }

  async ngOnInit() {
    // Check already created devices in c8y with type c8y_EwonFlexy
    this.flexyRegistration.getDeviceEwonFlexyInventoryList().then(
      async (devices) => {
        console.log("List of devices:");
        for (const device of devices) {
          console.log(device);
          let ewon : EwonFlexyStructure = { } as EwonFlexyStructure;

          //request for group asset
          const groups: IManagedObject[] =
            await this.flexyRegistration.getGroupInventoryListOfDevice(
              device.id
            );
          // let listGroups = [];
          // let groupIds = [];
          ewon.groups = [];
          for (const group of groups) {
            const myGroups = {
              name: group.name,
              id: group.id
            };
            ewon.groups = ewon.groups.concat(myGroups);
            // listGroups = listGroups.concat(group.name);
            // groupIds = groupIds.concat(group.id);
          }
          // const myGroups = {
          //   name: listGroups.toString().replace("[", "").replace("]", ""),
          //   id: groupIds.toString().replace("[", "").replace("]", ""),
          // };
          // ewon.groups = [];
          // ewon.groups = ewon.groups.concat(myGroups);
          console.log("ewon groups = ", ewon.groups);
          console.log(this.rows);

          const listExternalIds = await this.flexyRegistration.getExternalIdsOfManagedObject(device.id);
          if (listExternalIds.length > 0) {
            for (const externalId of listExternalIds) {
              if (externalId.type == EXTERNALID_TALK2M_SERIALTYPE){
                const flexy_id = externalId.externalId.replace(FLEXY_EXTERNALID_TALK2M_PREFIX,"");
                ewon.id = flexy_id;
              }
            }
    
          }else{
            continue;
          }
          ewon.registered = FlexyIntegrated.Integrated;
          ewon.name = device.name;
          ewon.talk2m_integrated = device.talk2m.id != "" ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
          ewon.description = device.talk2m.description ? device.talk2m.description : "";
          ewon.pool = device.talk2m.pool ? device.talk2m.pool : "";
          this.rows = this.rows.concat(ewon);
          
          console.log(this.rows);
        }
        // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(
      async (options) => {
        console.log("------------------------");
        options.forEach(option => {
          this._config[option.key] = option.value;
        });
        console.log(this._config);
        
        // No credentials available, then stop here.
        if (Object.keys(this._config).length  === 0){
          this.alert.warning("No credentials are defined. Could not establish a connection.");
          this.isLoading = false;
          this.isSessionConnected = false;
          return;
        }

        // Is session still active
        if(this._config.session){
          await this.talk2m.getaccountinfo(this._config.session).then(
            (result) => {
              this.isSessionConnected = true;
              console.log("---------------- GET EWONS");
              // Are pools defined?
              if (result.body.pools && result.body.pools.length > 0){
                for (const pool of result.body.pools) {
                  console.log("pool = ", pool.name);
                  this.talk2m.getewons(this._config.session, pool.id).then(
                    (response) => {    
                        for (const ewon of response.body.ewons) {
                          ewon.pool = pool.name;
                          ewon.talk2m_integrated = FlexyIntegrated.Integrated;
                          const index = this.rows.indexOf(this.rows.find(element => element.id == ewon.id));
                          console.log("index = ", index);
                          console.log(this.rows);
                          if(index > -1){ // remove duplicate
                            const sliced_ewon = this.rows.splice(index, 1);
                            ewon.groups = sliced_ewon[0].groups;
                          }
                          this.flexyRegistration.isDeviceRegistered(ewon.id, FLEXY_EXTERNALID_TALK2M_PREFIX, EXTERNALID_TALK2M_SERIALTYPE).then(
                            (result) => {
                              ewon.registered = (result) ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
                            }
                          );                          
                        }
                        
                        this.rows = this.rows.concat(response.body.ewons as EwonFlexyStructure[]);
                                        
                        console.log(this.rows);
                        this.isLoading = false;
                    }
                  );
                }
              }else{
                this.talk2m.getewons(this._config.session).then(
                  (response) => { 
                      this.rows = response.body.ewons as EwonFlexyStructure[];
                      console.log(this.rows);
                      this.isLoading = false;
                  }
                );
              }              
            },
            (error) => {
              this.alert.warning("Session is disconnected. Please reconnect.");
              this.isLoading = false;
              this.isSessionConnected = false;
            }
          );
        }else{
          this.alert.info("Session is no longer active. Please re-connect.");
          this.isLoading = false;
          this.isSessionConnected = false;
        }       
      },
      (error) => {
        this.alert.warning("Get credentials failed. ", error);
        this.isLoading = false;
        this.isSessionConnected = false;
      }
    );  
      }, (error) => {
        this.alert.danger("Platform is currently unavailable.", error)
      }
    );
    
    
    
  }

  ngOnDestroy(): void {
    // this.flexyRegistration.closeSubscriptionOnDeviceRequestRegistration();
  }

  private async registerAllDevices() {
    // Loop through selected items to register and register them in parallel
    const promises = this.selectedItems.map((item) =>
      this.registerDevice(item)
        .then(
          () => this.report.successfull.push(item),
          () => this.report.failed.push(item)
        )
        .then(
          () =>
            (this.completionPercent =
              ((this.report.failed.length + this.report.successfull.length) /
                this.selectItems.length) *
              100)
        )
    );
    await Promise.all(promises);
  }

  private async registerDevice(item: number) {
    const ewon: EwonFlexyStructure = this.rows.find(
      (element) => element.id == item
    );
    const ewonId = ewon.id.toString();

    if (ewon.registered !== FlexyIntegrated.Not_integrated) {
      this.alert.info(
        "Device with ewonId '" + ewonId + "' is already registered."
      );
      return;
    }

    console.log("Start registering device ewonId = " + ewonId);
    // 1. Create device request if not exists
    console.log("existing requests = ", this.existingRequests);
    const existingRequest = this.existingRequests.find(
      (element) => element.id == FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId
    );
    if (!existingRequest) {
      console.log("create device request with external id = ", ewonId);
      const registration =
        await this.flexyRegistration.createDeviceRequestRegistration(
          ewonId,
          FLEXY_EXTERNALID_TALK2M_PREFIX
        );
      console.log(ewonId + " createDeviceRequestRegistration: ", registration);
      // 1.1 Bootstraps the device credentials
      try {
        await this.flexyRegistration.requestDeviceCredentials(
          ewonId,
          FLEXY_EXTERNALID_TALK2M_PREFIX
        );
        // return in case we are actually able to retrieve the credentials
        return;
      } catch (error) {
        if (error && error.res && error.res.status === 404) {
          // the expected status
        } else {
          console.error("Unexpected error code.", error.res);
          throw error;
        }
      }
      console.log(
        "Credentials for device are not available. Device is in state PENDING_ACCEPTANCE, (not ACCEPTED))."
      );
      // 1.2 Change status to acceptance
      await this.flexyRegistration.acceptDeviceRequest(
        ewonId,
        FLEXY_EXTERNALID_TALK2M_PREFIX
      );
    } else {
      console.log("Request for device already exists. ewonId = ", ewonId);
    }
    // 2. Create inventoty managed object
    const mo = await this.flexyRegistration
      .createDeviceInventory(ewon)
      .catch((error) => {
        this.alert.warning("Create device invenotry failed.", error);
        throw error;
      });
    // 2.1 Change owner
    const deviceInventoryObj =
      await this.flexyRegistration.setDevivceOwnerExternalId(
        FLEXY_EXTERNALID_TALK2M_PREFIX + ewonId,
        mo.id
      );
    console.log("created inventory: ", deviceInventoryObj);
    // 3. Assign externalId to inventory
    const identityObj = await this.flexyRegistration.createIdentidyForDevice(
      deviceInventoryObj.id,
      ewonId,
      FLEXY_EXTERNALID_TALK2M_PREFIX,
      EXTERNALID_TALK2M_SERIALTYPE
    );
    // 4. Assign group to inventory
    if (ewon.pool && this.poolGroupList.has(ewon.pool)) {
      console.log("List of groups:", this.poolGroupList);
      console.log(
        "child group = " +
          this.poolGroupList.get(ewon.pool) +
          " parent device = " +
          identityObj.managedObject.id.toString()
      );
      await this.flexyRegistration.addGroupChildAssetToDevice(
        this.poolGroupList.get(ewon.pool),
        identityObj.managedObject.id.toString()
      );
    }
    this.rows[this.rows.findIndex((element) => element.id == item)].registered =
      FlexyIntegrated.Integrated;
  }

  async startRegistration() {
    console.log("----------------------");
    console.log("- START REGISTRATION -");
    console.log("----------------------");
    console.log("register device ids...", this.selectedItems);
    this.isRegistratingFlexy = true;

    // 0.1 Get existing device requests
    this.existingRequests =
      await this.flexyRegistration.getDeviceRequestRegistration();
    console.log("List of registrations: ", this.existingRequests);

    //0.2 Create group for pool definition
    const groups = await this.flexyRegistration.getDeviceGroupInventoryList();
    for (const item of this.selectedItems) {
      const ewon = this.rows.find((element) => element.id == item);
      if (this.poolGroupList.has(ewon.pool)) {
        continue;
      }
      const group = groups.find((group) => group.name == ewon.pool);
      if (ewon.pool && group) {
        this.poolGroupList.set(ewon.pool, group.id);
      } else if (ewon.pool && !group) {
        const createdGroup =
          await this.flexyRegistration.createDeviceGroupInventory(ewon.pool);
        this.poolGroupList.set(ewon.pool, createdGroup.id);
      }
    }

    await this.registerAllDevices();
    this.alert.info("Registration finished.", JSON.stringify(this.report));
    this.isRegistratingFlexy = false;
  }

  onRefresh(event) {
    console.log("Fetch gateways from talk2m again...", event);
  }

  selectItems(event) {
    this.selectedItems = event;
  }

  poolFilter(event) {
    console.log(event);
  }

  openModal() {
    this.registerManuallyService
      .openModalRegistration()
      .subscribe((newFlexy) => {
        console.log("new Flexy was created by modal.", newFlexy);
        newFlexy.registered = FlexyIntegrated.Integrated;
        newFlexy.talk2m_integrated = FlexyIntegrated.Not_integrated;
        this.rows = this.rows.concat(newFlexy);
      });
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: "name",
        header: "Name",
        path: "name",
        filterable: true,
        dataType: ColumnDataType.TextShort,
      },
      {
        name: "groups",
        header: "Cumulocity Group assigned",
        path: "groups",
        filterable: true,
        dataType: ColumnDataType.TextLong,
      },
      {
        name: "pool",
        header: "Talk2M Pool",
        path: "pool",
        filterable: true,
        dataType: ColumnDataType.TextShort,
      },
      {
        name: "description",
        header: "Talk2M Description",
        path: "description",
        dataType: ColumnDataType.TextLong,
      },
      {
        name: "talk2m_integrated",
        header: "Talk2M Registered",
        path: "talk2m_integrated",
        filterable: true,
        dataType: ColumnDataType.TextShort,
      },
      {
        name: "registered",
        header: "Cumulocity Registered",
        path: "registered",
        filterable: true,
        dataType: ColumnDataType.TextShort,
      },
    ];
  }
}
