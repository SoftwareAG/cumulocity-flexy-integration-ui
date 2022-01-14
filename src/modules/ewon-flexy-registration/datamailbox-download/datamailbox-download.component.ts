import { Component, OnInit} from "@angular/core";
import { AlertService} from "@c8y/ngx-components";
import { IManagedObject } from '@c8y/client';

import { EWONFlexyCredentialsTenantoptionsService } from "../../../services/ewon-flexy-credentials-tenantoptions.service";
import { FlexySettings } from "../../../interfaces/ewon-flexy-registration.interface";
import { MicroserviceIntegrationService } from './../../../services/c8y-microservice-talk2m-integration.service';
import { EWONFlexyDeviceRegistrationService } from './../../../services/ewon-flexy-device-registration.service';
import {SynchJobService} from './synchjob-modal/synchjob-modal.service';
import { EWONFlexySynchronizeJobService } from './../../../services/ewon-flexy-synchronize-job.service';

@Component({
    selector: "app-datamailbox-download",
    templateUrl: "./datamailbox-download.component.html",
    providers: [EWONFlexyCredentialsTenantoptionsService, 
                EWONFlexyDeviceRegistrationService, 
                MicroserviceIntegrationService, 
                SynchJobService, 
                EWONFlexySynchronizeJobService]
  })
  export class DataMailboxDownloadComponent implements OnInit {
    
    public isSessionConnected:boolean;
    public isLoading:boolean;

    private _config: FlexySettings = {};

    listJobs : IManagedObject[] = [];

    constructor( private alert: AlertService,
                  private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
                  private flexySynchronizationService: EWONFlexySynchronizeJobService,
                  private c8yMSService: MicroserviceIntegrationService,
                  public syncJobService: SynchJobService)
      {
        this.isSessionConnected = false;
        this.isLoading = true;
    }

    async ngOnInit(): Promise<void> {
        // Check credentials from tenant options
        this.flexyCredentials.getCredentials().then(
          async (options) => {
            console.log("------------------------");
            options.forEach(option => {
              this._config[option.key] = option.value;
            });
            console.log(this._config);
            if(this._config.token){
              this.isSessionConnected = await this.c8yMSService.isMicroserviceEnabled();
              if(!this.isSessionConnected){
                this.alert.warning("Microservice is not available.");
              }
            }else{
              this.alert.warning("Missing credentials to conntect.", JSON.stringify({t2mtoke: this._config.token}));
            }
          });
          
          //Check if jobs exist
          await this.refreshListOnloadingJobs();
    }

    async refreshListOnloadingJobs(){
      this.isLoading = true;
      const data = await this.flexySynchronizationService.listOnloadingJobs();
      this.listJobs =  data;
      console.log("list of jobs: ", this.listJobs);
      this.isLoading = false;
    }

  }