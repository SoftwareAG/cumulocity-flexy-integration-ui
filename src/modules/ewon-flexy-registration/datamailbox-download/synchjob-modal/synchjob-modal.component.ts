import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { C8yStepper, ModalLabels } from "@c8y/ngx-components";
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from "rxjs";
import { SynchJobService } from "./synchjob-modal.service";


enum step {
  FIRST = 0,
  SECOND = 1,
  THIRD = 2
}

@Component({
    selector: 'app-synchjob-modal',
    templateUrl: './synchjob-modal.component.html'
  })
  export class SynchjobModalComponent implements OnInit {

    formGroupStepOne: FormGroup;
    formGroupStepTwo: FormGroup;

    pendingStatus: boolean = false;

    @ViewChild(C8yStepper, { static: true })
    stepper: C8yStepper;
    
    private onClose: Subject<any> = new Subject();
    //labels : ModalLabels = {ok: "customOK", cancel: "customCancel"};

    constructor(private fb: FormBuilder,
      private syncJobService: SynchJobService,
      private bsModalRef: BsModalRef){
    }

    ngOnInit(): void { 
      this.formGroupStepOne = this.fb.group({
        name: ['', Validators.required]
      });
  
      this.formGroupStepTwo = this.fb.group({
        type: ['']
      });
    }
 
    async navigate(clickedStepIDX: number) {
      const { selectedIndex: selectedStepIDX } = this.stepper;
      const isMovingForward = clickedStepIDX > selectedStepIDX;
      if (isMovingForward) {
        this.onMovingForward(clickedStepIDX, selectedStepIDX);
      } else {
        this.onMovingBackward(clickedStepIDX, selectedStepIDX);
      }
    }
    onMovingForward(clickedStepIDX: number, selectedStepIDX: number) {
      this.stepper.next();
      if (clickedStepIDX === step.THIRD && selectedStepIDX === step.SECOND) {
        this.save();
      }
    }
    onMovingBackward(clickedStepIDX: number, selectedStepIDX: number) {
      if ((clickedStepIDX === step.FIRST || step.SECOND) && selectedStepIDX === step.THIRD) {
        this.resetStepper();
      } else if (clickedStepIDX === step.FIRST && selectedStepIDX === step.SECOND) {
        this.stepper.previous();
      }
    }

    async save() {
      this.pendingStatus = true;
      //await this.addDevice();
      this.pendingStatus = false;
      this.stepper.next();
    }

     close(isModal: boolean) {
      if (isModal) {
        this.onClose.next(null);
        this.bsModalRef.hide();
      } else {
        this.resetStepper();
      }
    }
    private resetStepper() {
      this.stepper.reset();
      this.stepper.selectedIndex = 1;
    }
  }