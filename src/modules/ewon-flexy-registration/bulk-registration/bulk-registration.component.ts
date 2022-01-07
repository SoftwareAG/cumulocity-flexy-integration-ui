import { IDeviceRegistration } from '@c8y/client';
import { Component, OnInit } from '@angular/core';
import { ActionControl, AlertService, Column, ColumnDataType, Pagination } from '@c8y/ngx-components';
//custom
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
import { EWONFlexyCredentialsTenantoptionsService } from '../../../services/ewon-flexy-credentials-tenantoptions.service';
import { Talk2MService } from '../../../services/talk2m.service';
import { EWONFlexyDeviceRegistrationService } from '../../../services/ewon-flexy-device-registration.service';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService, EWONFlexyDeviceRegistrationService],
})
export class BulkRegistrationComponent implements OnInit {
  
  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isLoading: boolean;
  public isRegistratingFlexy: boolean;

  public completionPercent: number;
  public selectedItems: Array<number>;
  public poolGroupList: Map<string,string>;
  public existingRequests: IDeviceRegistration[];

  public report = {
    failed: [],
    successful : []
  };

  columns: Column[] = [];
  rows: EwonFlexyStructure[] = [];

  actionControls: ActionControl[] = [];
  pagination: Pagination = {
    pageSize: 1000,
    currentPage: 1
  };

  constructor( private alert: AlertService,
    private talk2m: Talk2MService,
    private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
    private flexyRegistration: EWONFlexyDeviceRegistrationService
    ) { 
    this.isSessionConnected = false;
    this.isLoading = true;
    this.isRegistratingFlexy = false;

    this.poolGroupList = new Map;
    this.existingRequests = [];
    this.completionPercent = 0;
    this.columns = this.getDefaultColumns();
    this.selectedItems = [];
  }

  ngOnInit() {
    // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(
      async (options) => {
        console.log("------------------------");
        options.forEach(option => {
          this._config[option.key] = option.value;
        });
        console.log(this._config);

        // Is session still active
        if(this._config && this._config.session && this._config.devId){
          await this.talk2m.getaccountinfo(this._config.session, this._config.devId).then(
            (result) => {
              this.isSessionConnected = true;
              console.log("---------------- GET EWONS");
              // Are pools defined?
              if (result.body.pools && result.body.pools.length > 0){
                for (const pool of result.body.pools) {
                  console.log("pool = ", pool.name);
                  this.talk2m.getewons(this._config.session, this._config.devId, pool.id).then(
                    (response) => {    
                        for (const ewon of response.body.ewons) {
                          ewon.pool = pool.name;
                          this.flexyRegistration.isDeviceRegistered(ewon.id).then(
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
                this.talk2m.getewons(this._config.session, this._config.devId).then(
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
        }        
      },
      (error) => {
        this.alert.warning("Get credentials failed. ", error);
        this.isLoading = false;
        this.isSessionConnected = false;
      }
    );


  }

  ngOnDestroy(): void {
    // this.flexyRegistration.closeSubscriptionOnDeviceRequestRegistration();
  }

  private async registerAllDevices() {
    // Loop through selected items to register and register them in parallel
    const promises = this.selectedItems.map(item => 
      this.registerDevice(item)
        .then(() => this.report.successful.push(item), () => this.report.failed.push(item))
        .then(() => this.completionPercent = ((this.report.failed.length + this.report.successful.length) / this.selectItems.length)*100)
    );
    await Promise.all(promises);
  }

  private async registerDevice(item: number) {
    const ewon: EwonFlexyStructure = this.rows.find(element => element.id == item);

    if (ewon.registered !== FlexyIntegrated.Not_integrated) {
      this.alert.info("Device with externalId '" + ewon.id + "' is already registered.");
      return;
    }

    console.log("Start registering device id = " + ewon.id);
    // 1. Create device request if not exists
    const existingRequest = this.existingRequests.find(element => element.id == item.toString());
    if (!existingRequest){
      const registration = await this.flexyRegistration.createDeviceRequestRegistration(ewon.id.toString());
      console.log(ewon.id + ' createDeviceRequestRegistration: ', registration);
     // 1.1 Bootstraps the device credentials
      try {
        await this.flexyRegistration.requestDeviceCredentials(ewon.id.toString());
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
      console.log("Credentials for device are not available. Device is in state PENDING_ACCEPTANCE, (not ACCEPTED)).");
      // 1.2 Change status to acceptance 
      await this.flexyRegistration.acceptDeviceRequest(ewon.id.toString());
    }
    // 2. Create inventoty managed object
    const deviceInventoryObj = await this.flexyRegistration.createDeviceInventory(ewon).catch((error) => {
      this.alert.warning("Create device invenotry failed.", error);
      throw error;
    });
    console.log("created inventory: ", deviceInventoryObj);
    // 3. Assign externalId to inventory 
    const identityObj = await this.flexyRegistration.createIdentidyForDevice(deviceInventoryObj.id, ewon.id.toString());
    // 4. Assign group to inventory
    if (ewon.pool && this.poolGroupList.has(ewon.pool)){
      console.log("List of groups:", this.poolGroupList);
      console.log("child group = " + this.poolGroupList.get(ewon.pool) + " parent device = " + identityObj.managedObject.id.toString())
      await this.flexyRegistration.addGroupChildAssetToDevice(this.poolGroupList.get(ewon.pool), identityObj.managedObject.id.toString());
    }
    this.rows[this.rows.findIndex(element => element.id == item)].registered = FlexyIntegrated.Integrated;
  }
  
  async startRegistration(){
    console.log("----------------------");
    console.log("- START REGISTRATION -");
    console.log("----------------------");
    console.log("register device ids...", this.selectedItems);
    this.isRegistratingFlexy = true;

    // 0.1 Get existing device requests
    this.existingRequests = await this.flexyRegistration.getDeviceRequestRegistration();

    //0.2 Create group for pool definition
    const groups = await this.flexyRegistration.getDeviceGroupInventoryList()
    for (const item of this.selectedItems) {
      const ewon = this.rows.find(element => element.id == item);
      if (this.poolGroupList.has(ewon.pool)){
        continue;
      }
      const group = groups.find(group => group.name == ewon.pool)
      if (ewon.pool && group) {
        this.poolGroupList.set(ewon.pool, group.id) ;
      } else if(ewon.pool && !group) {
        const createdGroup = await this.flexyRegistration.createDeviceGroupInventory(ewon.pool)
        this.poolGroupList.set(ewon.pool, createdGroup.id);
      }
    }
    
    await this.registerAllDevices();
    this.alert.info("Registration finished.", JSON.stringify(this.report));
    this.isRegistratingFlexy = false;
  }

  onRefresh(event){
    console.log("Fetch gateways from talk2m again...", event);
  }

  selectItems(event){
    this.selectedItems = event;
  }

  poolFilter(event){
    console.log(event);
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },{
        name: 'pool',
        header: 'Pool',
        path: 'pool',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },{
        name: 'description',
        header: 'Description',
        path: 'description',
        dataType: ColumnDataType.TextLong
      },{
        name: 'registered',
        header: 'Cumulocity Registered',
        path: 'registered',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },
    ];
  }
}
