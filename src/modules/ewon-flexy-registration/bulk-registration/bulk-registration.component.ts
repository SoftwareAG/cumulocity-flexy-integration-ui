import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActionControl, AlertService, Column, ColumnDataType, DataGridComponent, Pagination } from '@c8y/ngx-components';
import { EwonFlexyStructure, FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
import { EWONFlexyCredentialsTenantoptionsService } from '../../../services/ewon-flexy-credentials-tenantoptions.service';
import { Talk2MService } from '../../../services/talk2m.service';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
  providers: [Talk2MService, EWONFlexyCredentialsTenantoptionsService],
})
export class BulkRegistrationComponent implements OnInit {
  
  private _config: FlexySettings = {};

  public isSessionConnected: boolean;
  public isLoading: boolean;

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
    ) { 
    this.isSessionConnected = false;
    this.isLoading = true;
    this.columns = this.getDefaultColumns();
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
          await this.talk2m.isSessionActive(this._config.session, this._config.devId).then(
            (result) => {
              this.isSessionConnected = result;
              this.talk2m.getewons(this._config.session, this._config.devId).then(
                (response) => {
                    console.log("---------------- GET EWONS");
                    this.rows = response.body.ewons as EwonFlexyStructure[];
                    console.log(this.rows);
                    this.isLoading = false;
                }, (error) => {
                  this.alert.warning("Connection failed. ", error);
                  this.isLoading = false;
                  this.isSessionConnected = false;
                }
              )
            },
            (error) => {
              this.alert.warning("Connection failed. ", error);
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

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },{
        name: 'description',
        header: 'Description',
        path: 'description',
        dataType: ColumnDataType.TextLong
      },
    ];
  }
}
