import { EwonFlexyStructure, FlexyIntegrated } from './../../../../interfaces/ewon-flexy-registration.interface';
import { FLEXY_EXTERNALID_FLEXY_PREFIX, EXTERNALID_FLEXY_SERIALTYPE } from './../../../../constants/flexy-integration.constants';
import { Component, Input, OnInit } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";

import { IDeviceRegistration, IManagedObject } from '@c8y/client';

import { BsModalRef } from 'ngx-bootstrap/modal';

import { Subject } from "rxjs";
import { EWONFlexyCredentialsTenantoptionsService } from "../../../../services/ewon-flexy-credentials-tenantoptions.service";
import { FlexySettings } from "../../../../interfaces/ewon-flexy-registration.interface";
import { Talk2MService } from "../../../../services/talk2m.service";
import { AlertService } from "@c8y/ngx-components";
import { EWONFlexyDeviceRegistrationService } from "../../../../services/ewon-flexy-device-registration.service";



@Component({
    selector: 'app-registration-modal',
    templateUrl: './registration-modal.component.html',
    styleUrls: ["registration-modal.component.less"],
    providers: [Talk2MService]
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
    public existingRequests: IDeviceRegistration[];

    newFlexy: IManagedObject;
    private _config: FlexySettings = {};
    
    constructor(private alert: AlertService,
      private bsModalRef: BsModalRef,
      private flexyCredentials: EWONFlexyCredentialsTenantoptionsService,
      private talk2m: Talk2MService,
      private flexyRegistration: EWONFlexyDeviceRegistrationService
      ){
      this.isFlexyConnected = true;
      this.existingRequests = [];
    }

    async ngOnInit(): Promise<void> {
        // Check credentials from tenant options
        this.flexyCredentials.getCredentials().then(
          async (options) => {
            console.log("------------------------");
            options.forEach(option => {
              this._config[option.key] = option.value;
            });
            console.log(this._config);

          });
        
        // 0.1 Get existing device requests
        this.existingRequests = await this.flexyRegistration.getDeviceRequestRegistration();
        console.log("List of registrations: ", this.existingRequests);
     }

    onRegister(config?: FlexySettings){
      if (config && config.device_user && config.device_pass){
        this.isFlexyConnected = false;
        console.log("Add and register Flexy with credentials: %s - %s", config.device_user, config.device_pass);
        console.log(config);
        console.log(this._config);
        this.talk2m.getserialnumber(config.device_name, config.device_user, config.device_pass, config.account, config.session ).then(
          (response) => {
            console.log("--------------------");
            console.log(response.slice(0,100) + "...");
            
            if( response.indexOf( "SerNum:" ) >= 0){
              let serial:string = "";
              for (var i = response.indexOf( "SerNum:" ) + 7; i < response.length; i++) {
                if ( ( response[i] >= '0' && response[i] <= '9' ) ||  response[i] == "-") {
                  serial = serial.concat(response[i]);
                }else{
                  break;
                }
              }
              this.registerFlexyWithSerialNumber(serial);

            }else{
              this.alert.warning("Unknown serial number. No data available.");
            }
            this.isFlexyConnected = true;
          } , (error:HttpErrorResponse) => {
            this.alert.warning("Connection to device failed.", JSON.stringify({ status: error.status,
                                                                                  text : error.statusText,
                                                                                  message: error.message}) );
            this.isFlexyConnected = true; // naming is confusing
          }
        );
      }
    }

    async registerFlexyWithSerialNumber(serial: string){
      console.log("Start registering device serial = " + serial);

      // 1. Create device request if not exists
      console.log("existing requests = ", this.existingRequests);
      const existingRequest = this.existingRequests.find(element => element.id == FLEXY_EXTERNALID_FLEXY_PREFIX+serial);
      if (!existingRequest){
        console.log("create device request with external id = ", serial)
        const registration = await this.flexyRegistration.createDeviceRequestRegistration(serial, FLEXY_EXTERNALID_FLEXY_PREFIX);
        console.log(serial + ' createDeviceRequestRegistration: ', registration);
      // 1.1 Bootstraps the device credentials
        try {
          await this.flexyRegistration.requestDeviceCredentials(serial, FLEXY_EXTERNALID_FLEXY_PREFIX);
          // return in case we are actually able to retrieve the credentials
          return;
        } catch (error) {
          if (error && error.res && error.res.status === 404) {
            // the expected status
          } else {
            console.error("Unexpected error code.", error.res);
            throw error;
          }
        }
        console.log("Credentials for device are not available. Device is in state PENDING_ACCEPTANCE, (not ACCEPTED)).");
        // 1.2 Change status to acceptance 
        await this.flexyRegistration.acceptDeviceRequest(serial, FLEXY_EXTERNALID_FLEXY_PREFIX);
      }else{
        console.log("Request for device already exists. serial = ", serial);
      }
      // 2. Create inventoty managed object
      const ewon: EwonFlexyStructure = {
        id: "", // no ewon id
        name: this._config.device_name,
        registered: FlexyIntegrated.Integrated,
        talk2m_integrated: FlexyIntegrated.Not_integrated
      };
      // If device with serial number exists, then return a warning and stop here.
      const isRegistered = await this.flexyRegistration.isDeviceRegistered(serial,FLEXY_EXTERNALID_FLEXY_PREFIX, EXTERNALID_FLEXY_SERIALTYPE);
      if (isRegistered){
        this.alert.warning("Device is already registered.");
        return;
      }
      const mo = await this.flexyRegistration.createDeviceInventory(ewon).catch((error) => {
        this.alert.warning("Create device invenotry failed.", error);
        throw error;
      });
      // 2.1 Change owner
      const deviceInventoryObj = await this.flexyRegistration.setDevivceOwnerExternalId(FLEXY_EXTERNALID_FLEXY_PREFIX+serial, mo.id);
      console.log("created inventory: ", deviceInventoryObj);
      // 3. Assign externalId to inventory 
      const identityObj = await this.flexyRegistration.createIdentidyForDevice(deviceInventoryObj.id, serial, FLEXY_EXTERNALID_FLEXY_PREFIX, EXTERNALID_FLEXY_SERIALTYPE);
      this.alert.success("Registered device successfully.");
      this.newFlexy = deviceInventoryObj;
      this.close();
    }

    close() {
        console.log("close with new Flexy...");
        console.log(this.newFlexy);
        this.onClose.next(this.newFlexy);
        this.bsModalRef.hide();
     }

  }