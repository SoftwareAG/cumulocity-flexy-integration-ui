import { Injectable } from "@angular/core";

import { BsModalService } from 'ngx-bootstrap/modal';

import { InventoryService } from "@c8y/ngx-components/api";
import { IManagedObject, IResult } from '@c8y/client';
import { Observable } from "rxjs";
import { RegistrationModalComponent } from "../modules/ewon-flexy-registration/bulk-registration/registration-modal/registration-modal.component";
import { EwonFlexyStructure } from "../interfaces/ewon-flexy-registration.interface";

@Injectable()
export class RegisterFlexyManualService {

    constructor( private modalService: BsModalService, 
        private inventoryService: InventoryService
      ) {}


      openModalRegistration() : Observable<IManagedObject> {
        const modalRef = this.modalService.show(RegistrationModalComponent, {
          initialState: { isModal: true },
          class: 'modal-sm'
        });
        const modal : RegistrationModalComponent = modalRef.content;
        return modal.onClose.asObservable();
      }
}