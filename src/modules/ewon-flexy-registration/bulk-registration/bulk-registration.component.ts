import { Component, OnInit } from '@angular/core';
import { ActionControl, AlertService, Column, ColumnDataType, DataGridComponent, Pagination } from '@c8y/ngx-components';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '../../../interfaces/ewon-flexy-registration.interface';
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
                          ewon.integrated = FlexyIntegrated.Not_integrated;
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

  gridChanges(event){
    console.log(event);
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
        name: 'integrated',
        header: 'Integrated',
        path: 'integrated',
        filterable: true,
        dataType: ColumnDataType.TextShort
      },
    ];
  }
}
