import { IManagedObject } from '@c8y/client';
import { IOnloadingJobObject } from './../../../../interfaces/c8y-custom-objects.interface';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActionControl, AlertService, C8yStepper, Column, ColumnDataType, Item, ModalLabels, Pagination } from "@c8y/ngx-components";
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from "rxjs";
import { EWONFlexyCredentialsTenantoptionsService } from '../../../../services/ewon-flexy-credentials-tenantoptions.service';
import { EwonFlexyStructure, FlexyIntegrated, FlexySettings } from '../../../../interfaces/ewon-flexy-registration.interface';
import { MicroserviceIntegrationService } from '../../../../services/c8y-microservice-talk2m-integration.service';
import { EWONFlexyDeviceRegistrationService } from '../../../../services/ewon-flexy-device-registration.service';
import { SyncOnloadJobService } from '../../../../services/synchronize-job.service';
import { FLEXY_EXTERNALID_TALK2M_PREFIX, FLEXY_EXTERNALID_FLEXY_PREFIX } from "../../../../constants/flexy-integration.constants";


enum step {
  FIRST = 0,
  SECOND = 1,
  THIRD = 2
}

@Component({
    selector: 'app-synchjob-modal',
    templateUrl: './synchjob-modal.component.html',
  })
  export class SynchjobModalComponent implements OnInit {

    private _config: FlexySettings = {};
    
    public isLoading:boolean;

    formGroupStepOne: FormGroup;
    formGroupStepTwo: FormGroup;

    pendingStatus: boolean = false;

    @ViewChild(C8yStepper, { static: true })
    stepper: C8yStepper;

    columns: Column[] = [];
    rows: EwonFlexyStructure[] = [];

    actionControls: ActionControl[] = [];
    pagination: Pagination = {
      pageSize: 1000,
      currentPage: 1
    };

    newJob: IManagedObject;
    
    public onClose: Subject<IManagedObject> = new Subject();

    constructor(private alert: AlertService,
      private fb: FormBuilder,
      private syncJobService: SyncOnloadJobService,
      private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
      private bsModalRef: BsModalRef,
      private flexyRegistrationService: EWONFlexyDeviceRegistrationService,
      private c8yMSService: MicroserviceIntegrationService,
     // private dmComponent: DataMailboxDownloadComponent
      ){
        this.columns = this.getDefaultColumns();
        this.rows = [];
    }

    ngOnInit(): void { 
      this.formGroupStepOne = this.fb.group({
        name: ['', Validators.required],
        description: ['']
      });
      this.formGroupStepTwo = this.fb.group({
        ewonIds: ['']
      });

      // Get list of ewons to sync from microservice
      this.flexyCredentials.getCredentials().then(
        async (options) => {
          console.log("------------------------");
          options.forEach(option => {
            this._config[option.key] = option.value;
          });
          console.log(this._config);
          if(this._config.token){

            const ewons: EwonFlexyStructure[] =  await this.c8yMSService.getEwons(this._config.token);
              
              for (const ewon of ewons) {
                try {
                  let isRegistered = await this.flexyRegistrationService.isDeviceRegistered(ewon.id+"", FLEXY_EXTERNALID_TALK2M_PREFIX);
                  if (!isRegistered){
                    isRegistered = await this.flexyRegistrationService.isDeviceRegistered(ewon.id+"", FLEXY_EXTERNALID_FLEXY_PREFIX);
                  }
                  ewon.registered = (isRegistered) ? FlexyIntegrated.Integrated : FlexyIntegrated.Not_integrated;
                  this.rows = this.rows.concat(ewon);
                }catch (error) {
                  this.isLoading = false;
                  continue;
                }
              }
            }else{
              this.alert.warning("Missing credentials to conntect.", JSON.stringify({t2mtoke: this._config.token}));
            }
            this.isLoading = false;
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
      if (clickedStepIDX === step.FIRST && selectedStepIDX === step.SECOND) {
        this.stepper.previous();
      }
    }

    async save() {

      if (this.formGroupStepTwo.value.ewonIds > 0){
          this.pendingStatus = true;
          //create new managed object 
          this.newJob = await this.syncJobService.createOnloadingJob(
            { 
              ewonIds : this.formGroupStepTwo.value.ewonIds,
              name : this.formGroupStepOne.value.name,
              description : this.formGroupStepOne.value.description,
              isActive : false
            } as IOnloadingJobObject);

          this.pendingStatus = false;
          this.stepper.next();
      }else{
        this.alert.info("Please select one item.");
      }
    }

     close() {
       this.onClose.next(this.newJob);
       this.bsModalRef.hide();
    }

    selectItems(items: []){
      this.formGroupStepTwo.value.ewonIds = items;
      console.log("formGroupStepTwo = ", this.formGroupStepTwo);
    }

    getDefaultColumns(): Column[] {
      return [
        {
          name: 'name',
          header: 'Name',
          path: 'name',
          filterable: true,
          dataType: ColumnDataType.TextShort
        },
        // {
        //   name: 'pool',
        //   header: 'Pool',
        //   path: 'pool',
        //   filterable: true,
        //   dataType: ColumnDataType.TextShort
        // },{
        //   name: 'description',
        //   header: 'Description',
        //   path: 'description',
        //   dataType: ColumnDataType.TextLong
        // },
        {
          name: 'registered',
          header: 'Cumulocity Registered',
          path: 'registered',
          filterable: true,
          dataType: ColumnDataType.TextShort
        },{
          name: 'dmLastSyncDate',
          header: 'DataMailbox last sync date',
          path: 'lastSynchroDate',
          filterable: false,
          dataType: ColumnDataType.TextShort
        },
        // {
        //   name: 'c8yLastSyncDate',
        //   header: 'Cumulocity last sync date',
        //   path: 'c8yLastSynchroDate',
        //   filterable: false,
        //   dataType: ColumnDataType.TextShort
        // }
      ];
    }
  }