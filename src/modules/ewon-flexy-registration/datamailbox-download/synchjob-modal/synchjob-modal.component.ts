import { OnloadingJob } from './../../../../interfaces/c8y-custom-objects.interface';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActionControl, C8yStepper, Column, ColumnDataType, Item, ModalLabels, Pagination } from "@c8y/ngx-components";
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
    selectedDevices: Item[];

    pendingStatus: boolean = false;

    @ViewChild(C8yStepper, { static: true })
    stepper: C8yStepper;

    columns: Column[] = [];
    rows: [] = [];

    actionControls: ActionControl[] = [];
    pagination: Pagination = {
      pageSize: 1000,
      currentPage: 1
    };
    
    private onClose: Subject<any> = new Subject();
    //labels : ModalLabels = {ok: "customOK", cancel: "customCancel"};

    constructor(private fb: FormBuilder,
      private syncJobService: SynchJobService,
      private bsModalRef: BsModalRef){
        this.columns = this.getDefaultColumns();
    }

    ngOnInit(): void { 
      this.formGroupStepOne = this.fb.group({
        name: ['', Validators.required],
        description: ['']
      });
  
      this.formGroupStepTwo = this.fb.group({
        ewonIds: ['']
      });
    }
 
    async navigate(clickedStepIDX: number) {
      console.log("navigate event: ", clickedStepIDX);
      const { selectedIndex: selectedStepIDX } = this.stepper;
      const isMovingForward = clickedStepIDX > selectedStepIDX;
      if (isMovingForward) {
        this.onMovingForward(clickedStepIDX, selectedStepIDX);
      } else {
        this.onMovingBackward(clickedStepIDX, selectedStepIDX);
      }
    }
    onMovingForward(clickedStepIDX: number, selectedStepIDX: number) {
      console.log("onMovingForward event: ", {clickedStepIDX,selectedStepIDX});
      console.log("form one: ", this.formGroupStepOne);
      console.log("form two: ", this.formGroupStepTwo);
      this.stepper.next();
      if (clickedStepIDX === step.THIRD && selectedStepIDX === step.SECOND) {
        this.save();
      }
    }
    onMovingBackward(clickedStepIDX: number, selectedStepIDX: number) {
      console.log("onMovingBackward event: ", {clickedStepIDX,selectedStepIDX});
      console.log("form one: ", this.formGroupStepOne);
      console.log("form two: ", this.formGroupStepTwo);
      if ((clickedStepIDX === step.FIRST || step.SECOND) && selectedStepIDX === step.THIRD) {
        this.resetStepper();
      } else if (clickedStepIDX === step.FIRST && selectedStepIDX === step.SECOND) {
        this.stepper.previous();
      }
    }

    async save() {
      this.pendingStatus = true;
      await this.addOnloadingJob();
      this.pendingStatus = false;
      this.stepper.next();
    }

    private async addOnloadingJob() {
      console.log("addOnloadingJob...");
      await this.syncJobService.addOnloadingJob(
        { } as OnloadingJob);
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

    selectItems(items: []){
      this.selectedDevices = items;
      console.log("selectedDevices = ", this.selectedDevices);
    }

    getDefaultColumns(): Column[] {
      return [
        {
          name: 'name',
          header: 'Name',
          path: 'name',
          filterable: true,
          dataType: ColumnDataType.TextShort
        },{
          name: 'pool',
          header: 'Pool',
          path: 'pool',
          filterable: true,
          dataType: ColumnDataType.TextShort
        },{
          name: 'description',
          header: 'Description',
          path: 'description',
          dataType: ColumnDataType.TextLong
        },{
          name: 'registered',
          header: 'Cumulocity Registered',
          path: 'registered',
          filterable: true,
          dataType: ColumnDataType.TextShort
        },
      ];
    }
  }