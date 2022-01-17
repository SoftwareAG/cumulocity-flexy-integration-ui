import { InventoryService } from '@c8y/ngx-components/api';
import { Component, Input, OnInit } from "@angular/core";
import { IManagedObject } from '@c8y/client';

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

    constructor(private inventoryService: InventoryService){
      
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
  }