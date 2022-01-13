import { Injectable } from "@angular/core";
import { BsModalService } from 'ngx-bootstrap/modal';
import {SynchjobModalComponent} from './synchjob-modal.component';


@Injectable()
export class SynchJobService {

  constructor(private modalService: BsModalService) {
  }


  modalCreateSynchJob() {
    this.modalService.show(SynchjobModalComponent, {
      initialState: { isModal: true },
      class: 'modal-lg'
    });
  }
}