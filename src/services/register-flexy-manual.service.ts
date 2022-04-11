import { Injectable } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { IManagedObject } from '@c8y/client';
import { Observable } from 'rxjs';
import { RegistrationModalComponent } from '@modules/ewon-flexy-registration/bulk-registration/registration-modal/registration-modal.component';

@Injectable()
export class RegisterFlexyManualService {
  constructor(private modalService: BsModalService) {}

  openModalRegistration(): Observable<IManagedObject> {
    const modalRef = this.modalService.show(RegistrationModalComponent, {
      initialState: { isModal: true },
      class: 'modal-sm'
    });
    const modal: RegistrationModalComponent = modalRef.content;
    return modal.onClose.asObservable();
  }
}
