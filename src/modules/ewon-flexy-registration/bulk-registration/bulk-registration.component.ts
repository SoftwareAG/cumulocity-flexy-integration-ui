import { InventoryService } from '@c8y/ngx-components/api';
import { Component, OnInit } from '@angular/core';
import { ActionControl, AlertService, Column, ColumnDataType, Pagination } from '@c8y/ngx-components';
//custom
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
import { EWONFlexyCredentialsTenantoptionsService } from '../../../services/ewon-flexy-credentials-tenantoptions.service';
import { Talk2MService } from '../../../services/talk2m.service';
import { EWONFlexyDeviceRegistrationService } from '../../../services/ewon-flexy-device-registration.service';
import { templateVisitAll } from '@angular/compiler';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService, EWONFlexyDeviceRegistrationService],
})
export class BulkRegistrationComponent implements OnInit {
  
  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isLoading: boolean;
  public selectedItems: Array<number>;

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
  
  async startRegistration(){
    console.log("----------------------");
    console.log("- START REGISTRATION -");
    console.log("----------------------");
    console.log("register device ids...", this.selectedItems);

    for (const item of this.selectedItems) {
      const ewon = this.rows.find(element => element.id == item);

      // https://cumulocity.com/guides/device-sdk/rest/#step-0-request-device-credentials
      if(ewon.registered == FlexyIntegrated.Not_integrated){
        console.log("Start registering device id = " + ewon.id);

        // 1. Create device request
        await this.flexyRegistration.createDeviceRequestRegistration(ewon.id.toString()).then(
          (result) => {
            // 1.1 Bootstraps the device credentials
            this.flexyRegistration.requestDeviceCredentials(ewon.id.toString()).then(
              () => {},
              (error) => {
                if(error.res.status == 404){
                  console.log("Credentials for device are not available. Device is in state PENDING_ACCEPTANCE, (not ACCEPTED)).");
                  // 1.2 Change status to acceptance 
                  this.flexyRegistration.acceptDeviceRequest(ewon.id.toString()).then(
                    () => {
                      // 2. Create inventoty managed object
                      this.flexyRegistration.createDeviceInventory(ewon.name).then(
                        (result) => {
                          // 3. Assign externalId to inventory 
                          this.flexyRegistration.createIdentidyForDevice(result.id, ewon.id.toString()).then(
                            () => {
                              this.rows[this.rows.findIndex(element => element.id == item)].registered = FlexyIntegrated.Integrated;
                            }
                          );
                        }, (error) => {
                          this.alert.warning("Create device invenotry failed.", error);
                        }
                    );
                    }
                  );
                }else{
                  console.error("Unexpected error code.", error.res);
                }
              }
            );
          }
          );
        
      }else{
        this.alert.info("Device with externalId '" + ewon.id + "' is already registered.");
      }
    }
    
  }

  onRefresh(event){
    console.log("Fetch gateways from talk2m again...", event);
  }

  selectItems(event){
    console.log(event);
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
