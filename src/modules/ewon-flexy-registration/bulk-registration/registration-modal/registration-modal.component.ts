import { Component, OnInit } from "@angular/core";

import { IManagedObject } from '@c8y/client';

import { BsModalRef } from 'ngx-bootstrap/modal';

import { Subject } from "rxjs";



@Component({
    selector: 'app-registration-modal',
    templateUrl: './registration-modal.component.html',
  })
  export class RegistrationModalComponent implements OnInit {
    
    public onClose: Subject<IManagedObject> = new Subject();

    newFlexy: IManagedObject;
    
    constructor(private bsModalRef: BsModalRef){}

    ngOnInit(): void { }

    close() {
        this.onClose.next(this.newFlexy);
        this.bsModalRef.hide();
     }

  }