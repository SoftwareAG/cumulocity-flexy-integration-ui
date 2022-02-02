import { Component, Input, OnInit } from "@angular/core";

import { IManagedObject } from '@c8y/client';

import { BsModalRef } from 'ngx-bootstrap/modal';

import { Subject } from "rxjs";
import { FlexySettings } from "../../../../interfaces/ewon-flexy-registration.interface";



@Component({
    selector: 'app-registration-modal',
    templateUrl: './registration-modal.component.html',
    styleUrls: ["registration-modal.component.less"],
  })
  export class RegistrationModalComponent implements OnInit {
    @Input() set config(value: any) {
      console.log("set config", value);
      this._config = value;
    }
    get config(): any {
      return this._config;
    }

    public onClose: Subject<IManagedObject> = new Subject();
    public isFlexyConnected: boolean;

    newFlexy: IManagedObject;
    private _config: FlexySettings = {};
    
    constructor(private bsModalRef: BsModalRef){
      this.isFlexyConnected = true;
    }

    ngOnInit(): void { }

    onRegister(config?: FlexySettings){
      if (config && config.device_user && config.device_pass){
        this.isFlexyConnected = false;
        console.log("Add and register Flexy with credentials: %s - %s", config.device_user, config.device_pass);
      }
    }
    close() {
        this.onClose.next(this.newFlexy);
        this.bsModalRef.hide();
     }

  }