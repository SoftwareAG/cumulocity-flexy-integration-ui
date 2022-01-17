import { InventoryService } from '@c8y/ngx-components/api';
import { Component, Input, OnInit } from "@angular/core";
import { IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';

@Component({
    selector: 'app-synchjob-card',
    templateUrl: './synchjob-card.component.html'
  })
  export class SynchjobCardComponent implements OnInit {

    @Input() title: string;
    @Input() description: string;
    @Input() isActive: boolean;
    @Input() id: string;

    singleModel = true;

    constructor(private inventoryService: InventoryService,
      private alert: AlertService){
      
    }

    ngOnInit(): void { this.singleModel = this.isActive; }

    async changeActive() : Promise<void>{
      console.log("change active status = ", this.singleModel); 
      
      const partialUpdateObject: Partial<IManagedObject> = {
        id: this.id,
        isActive: this.singleModel,
        };
      await this.inventoryService.update(partialUpdateObject);
    }

    onDelete() : void {
      this.alert.info("Delete item to be done...")
    }

    onloadNow() : void {
      this.alert.info("Onload now to be done...")
    }
  }