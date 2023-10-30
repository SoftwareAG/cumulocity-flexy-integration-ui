import { Component, OnInit } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { FlexySettings } from '@flexy/models/flexy.model';
import { CerdentialsService, MicroserviceIntegrationService, SyncOnloadJobService } from '@flexy/services';

@Component({
  selector: 'app-datamailbox-download',
  templateUrl: './datamailbox-download.component.html'
})
export class DataMailboxDownloadComponent implements OnInit {
  private _config: FlexySettings = {};
  isSessionConnected: boolean;
  isLoading: boolean;
  listJobs: IManagedObject[] = [];

  constructor(
    private alert: AlertService,
    private flexyCredentials: CerdentialsService,
    private c8yMSService: MicroserviceIntegrationService,
    public syncJobService: SyncOnloadJobService
  ) {
    this.isSessionConnected = false;
    this.isLoading = true;
  }

  async ngOnInit(): Promise<void> {
    // Check credentials from tenant options
    this.flexyCredentials.getCredentials().then(async (options) => {
      options.forEach((option) => {
        this._config[option.key] = option.value;
      });
      if (this._config.token) {
        this.isSessionConnected = await this.c8yMSService.isMicroserviceEnabled();
        if (!this.isSessionConnected) {
          this.alert.warning('Microservice is not available.');
        }
      } else {
        this.alert.warning(
          'Missing credentials to connect.',
          JSON.stringify({
            t2mtoken: this._config.token ? this._config.token : ''
          })
        );
      }
    });

    //Check if jobs exist
    await this.refreshListOnloadingJobs();

    // subscribe on deleted items
    this.syncJobService.onDelete.subscribe((onDelete) => {
      this.listJobs = this.listJobs.filter(function (job) {
        return job.id !== onDelete;
      });
    });
  }

  async refreshListOnloadingJobs() {
    this.isLoading = true;
    const data = await this.syncJobService.listOnloadingJobs();
    this.listJobs = data;
    this.isLoading = false;
  }

  openModal() {
    this.syncJobService.openModalSynchJob().subscribe(() => {
      this.refreshListOnloadingJobs();
    });
  }
}
