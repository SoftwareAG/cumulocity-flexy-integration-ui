import { Component, OnInit } from "@angular/core";
import { AlertService, Column, ColumnDataType } from "@c8y/ngx-components";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";
import { EwonFlexyStructure, FlexySettings } from "../../../interfaces/ewon-flexy-registration.interface";


@Component({
    selector: "app-datamailbox-download",
    templateUrl: "./datamailbox-download.component.html",
    providers: [EWONFlexyCredentialsTenantoptionsService]
  })
  export class DataMailboxDownloadComponent implements OnInit {
    
    public isSessionConnected:boolean;
    public isLoading:boolean;
    public selectedItems: any[];

    columns: Column[] = [];
    rows: EwonFlexyStructure[] = [];
    private _config: FlexySettings = {};

    constructor( private alert: AlertService,
      private flexyCredentials: EWONFlexyCredentialsTenantoptionsService){
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
              // TODO
            }else{
              this.alert.warning("Missing credentials to conntect.", JSON.stringify({t2mtoke: this._config.token, t2mdevid: this._config.devId}));
              this.isLoading = false;
            }
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