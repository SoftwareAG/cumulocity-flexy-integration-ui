import { Injectable } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { RegistrationModalComponent } from '@flexy/components';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RegisterFlexyManualService {
  constructor(private modalService: BsModalService) {}

  // TODO move to component
  openModalRegistration(): Observable<IManagedObject> {
    const modalRef = this.modalService.show(RegistrationModalComponent, {
      // initialState: { isModal: true }, // TODO
      class: 'modal-sm'
    });
    const modal: RegistrationModalComponent = modalRef.content;
    return modal.onClose.asObservable();
  }
}
