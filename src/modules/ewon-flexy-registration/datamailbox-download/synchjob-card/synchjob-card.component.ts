import { Component, Input, OnInit } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { InventoryService, TenantService } from '@c8y/ngx-components/api';
import { MicroserviceIntegrationService } from '@services/c8y-microservice-talk2m-integration.service';
import { CerdentialsService } from '@services/credentials.service';
import { SyncOnloadJobService } from '@services/synchronize-job.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-synchjob-card',
  templateUrl: './synchjob-card.component.html'
})
export class SynchjobCardComponent implements OnInit {
  toggleActive: boolean = true;
  onDelete: Subject<IManagedObject> = new Subject();
  @Input() title: string;
  @Input() description: string;
  @Input() isActive: boolean;
  @Input() id: string;

  constructor(
    private inventoryService: InventoryService,
    private c8yMSService: MicroserviceIntegrationService,
    private tenantOptionsService: CerdentialsService,
    private alert: AlertService,
    private syncJob: SyncOnloadJobService,
    private tenantService: TenantService
  ) {}

  ngOnInit(): void {
    this.toggleActive = this.isActive;
  }

  async changeActive(): Promise<void> {
    const partialUpdateObject: Partial<IManagedObject> = {
      id: this.id,
      isActive: this.toggleActive
    };
    await this.inventoryService.update(partialUpdateObject);
  }

  delete(): void {
    this.alert.info('Deleted onloading job.');
    this.syncJob.deleteOnloadingJob(this.id);
  }

  async onloadNow(): Promise<void> {
    this.tenantOptionsService.getCredentials().then(
      async (tenantoptions) => {
        const token = tenantoptions.filter((tmp) => tmp.key == 'token');
        const tenant = await this.tenantService.current();
        const tenantId = tenant.data.name;

        if (token.length == 1) {
          const result = await this.c8yMSService.onloadNow(token[0].value, this.id, tenantId);
          if (result.status != 200) {
            const result_data = await result.json();
            this.alert.danger('Onloading job failed.', result_data);
          } else {
            this.alert.success('Onloading data was successful.');
          }
        } else {
          console.error('Token is not unique.', token);
          this.alert.danger('Internal server error. Multiple tokens found.');
        }
      },
      (error) => {
        this.alert.danger('Onloading job failed. Platform is not available.', error);
      }
    );
  }
}
