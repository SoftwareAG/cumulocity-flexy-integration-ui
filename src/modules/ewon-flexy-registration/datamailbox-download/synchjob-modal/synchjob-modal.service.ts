import { OnloadingJob } from './../../../../interfaces/c8y-custom-objects.interface';
import { InventoryService } from '@c8y/ngx-components/api';
import { IManagedObject } from '@c8y/client';
import { Injectable } from "@angular/core";
import { BsModalService } from 'ngx-bootstrap/modal';
import {SynchjobModalComponent} from './synchjob-modal.component';


@Injectable()
export class SynchJobService {

  private job: IManagedObject;

  constructor(private modalService: BsModalService, private inventoryService: InventoryService) {
  }


  modalCreateSynchJob() {
    this.modalService.show(SynchjobModalComponent, {
      initialState: { isModal: true },
      class: 'modal-lg'
    });
  }

  addOnloadingJob(job: OnloadingJob){
    const partialManagedObj: Partial<OnloadingJob> = job;
    return this.inventoryService.create(partialManagedObj);
  }
}