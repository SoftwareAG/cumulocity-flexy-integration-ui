import { Component, OnInit } from '@angular/core';
import { AlertService } from '@c8y/ngx-components';
import { IManagedObject } from '@c8y/client';
import { FlexySettings } from '@interfaces/flexy.interface';
import { CerdentialsService } from '@services/credentials.service';
import { MicroserviceIntegrationService } from '@services/c8y-microservice-talk2m-integration.service';
import { SyncOnloadJobService } from '@services/synchronize-job.service';

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
            t2mtoke: this._config.token ? this._config.token : ''
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
    this.syncJobService.openModalSynchJob().subscribe((newJob) => {
      this.refreshListOnloadingJobs();
    });
  }
}
