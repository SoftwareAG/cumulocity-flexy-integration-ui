import { Component, OnInit } from "@angular/core";
import { ActionControl, AlertService, Column, ColumnDataType, Pagination } from "@c8y/ngx-components";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";
import { EwonFlexyStructure, FlexySettings } from "../../../interfaces/ewon-flexy-registration.interface";
import { MicroserviceIntegrationService } from './../../../services/c8y-microservice-talk2m-integration.service';

@Component({
    selector: "app-datamailbox-download",
    templateUrl: "./datamailbox-download.component.html",
    providers: [EWONFlexyCredentialsTenantoptionsService, MicroserviceIntegrationService]
  })
  export class DataMailboxDownloadComponent implements OnInit {
    
    public isSessionConnected:boolean;
    public isLoading:boolean;
    public selectedItems: any[];

    columns: Column[] = [];
    rows: EwonFlexyStructure[] = [];
    actionControls: ActionControl[] = [];
    pagination: Pagination = {
      pageSize: 1000,
      currentPage: 1
    };

    private _config: FlexySettings = {};

    constructor( private alert: AlertService,
      private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
      private c8yMSService: MicroserviceIntegrationService){
      this.isSessionConnected = false;
      this.isLoading = true;
      
      this.columns = this.getDefaultColumns();
      this.selectedItems = [];
    }
    ngOnInit(): void {
        // Check credentials from tenant options
        this.flexyCredentials.getCredentials().then(
          async (options) => {
            console.log("------------------------");
            options.forEach(option => {
              this._config[option.key] = option.value;
            });
            console.log(this._config);
            if(this._config.devId && this._config.token){
              this.isSessionConnected = await this.c8yMSService.isMicroserviceEnabled();
              const ewons: EwonFlexyStructure[] =  await this.c8yMSService.getEwons(this._config.token,this._config.devId);
              this.rows = this.rows.concat(ewons);

            }else{
              this.alert.warning("Missing credentials to conntect.", JSON.stringify({t2mtoke: this._config.token, t2mdevid: this._config.devId}));
              
            }
            this.isLoading = false;
          });
    }

    selectItems(event){
      this.selectedItems = event;
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