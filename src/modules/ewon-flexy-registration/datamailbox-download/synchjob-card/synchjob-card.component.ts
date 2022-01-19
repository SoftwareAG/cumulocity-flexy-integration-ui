
import { InventoryService } from '@c8y/ngx-components/api';
import { Component, ComponentRef, Input, OnInit } from "@angular/core";
import { IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { Observable, Subject } from 'rxjs';
import { SyncOnloadJobService } from '../../../../services/synchronize-job.service';
@Component({
    selector: 'app-synchjob-card',
    templateUrl: './synchjob-card.component.html'
  })
  export class SynchjobCardComponent implements OnInit {

    @Input() title: string;
    @Input() description: string;
    @Input() isActive: boolean;
    @Input() id: string;

    toggleActive : boolean = true;

    public onDelete: Subject<IManagedObject> = new Subject();

    constructor(private inventoryService: InventoryService,
      private alert: AlertService,
      private syncJob : SyncOnloadJobService
      ){
      
    }

    ngOnInit(): void { this.toggleActive = this.isActive; }

    async changeActive() : Promise<void>{
      const partialUpdateObject: Partial<IManagedObject> = {
        id: this.id,
        isActive: this.toggleActive,
        };
      await this.inventoryService.update(partialUpdateObject);
    }

    delete() : void {
      this.alert.info("Deleted onloading job.");
      this.syncJob.deleteOnloadingJob(this.id);
    }

    onloadNow() : void {
      this.alert.info("Onload now to be done...");
    }
  }