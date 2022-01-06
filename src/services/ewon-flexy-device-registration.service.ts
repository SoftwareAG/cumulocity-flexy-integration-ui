import { Injectable } from "@angular/core";
import { IManagedObject, IExternalIdentity, DeviceRegistrationService, IDeviceRegistrationCreate, IDeviceRegistration, IDeviceBootstrapOptions, IDeviceCredentials, IIdentified } from "@c8y/client";
import { InventoryService, IdentityService } from "@c8y/ngx-components/api";
import { FLEXY_DEVICETYPE, FLEXY_SERIALTYPE } from './../constants/flexy-integration.constants';

@Injectable()
export class EWONFlexyDeviceRegistrationService {

  constructor(
    private inventoryService: InventoryService,
    private identityService: IdentityService,
    private deviceRegistration: DeviceRegistrationService,
  ) {}

  // InventoryService
  async createDeviceInventory(name:string): Promise<IManagedObject> {
    const partialManagedObj: Partial<IManagedObject> = {
             pageSize: 1,
             withTotalPages: true,
             name: name,
             type:  FLEXY_DEVICETYPE,
             c8y_IsDevice: {}
           };   
    const { data, res } = await this.inventoryService.create(partialManagedObj);
    return data;
  }
  async getDeviceGroupInventoryList(): Promise<IManagedObject[]>{
    const filter: object = {
           pageSize: 100,
           withTotalPages: true,
           fragmentType: 'c8y_IsDeviceGroup'
         };
    const {data, res, paging} = await this.inventoryService.list(filter);
    return data;
  }
  async createDeviceGroupInventory(pool:string): Promise<IManagedObject> {
    const partialManagedObj: Partial<IManagedObject> = {
             pageSize: 1,
             withTotalPages: true,
             name: pool,
             type:  'c8y_DeviceGroup',
             c8y_IsDeviceGroup: {}
           };   
    const { data, res } = await this.inventoryService.create(partialManagedObj);
    return data;
  }
  async addGroupChildAssetToDevice(groupId: string, deviceId: string): Promise<IIdentified>{
    const {data, res} = await this.inventoryService.childAssetsAdd(deviceId, groupId);
    return data;
  }
  //--------  

  // IdentityService
  async isDeviceRegistered(externalId:string): Promise<boolean> {
    const identity: IExternalIdentity = {
            type: FLEXY_SERIALTYPE,
            externalId: externalId
          };
    const data = await this.identityService.detail(identity).then(
      (result) => { return true;},
      (error) => { return false; }
    )
    return data;
  }
  
  async getDeviceManagedObjectWithExternalId(externalId:string): Promise<IIdentified>{
    const identity: IExternalIdentity = {
      type: FLEXY_SERIALTYPE,
      externalId: externalId
    };
    const data = await this.identityService.detail(identity).then(
      (identity) => {
        //const managedObjId: number =identity.data.managedObject.id;
        //inventoryService
        return identity.data.managedObject;
      }, (error) => {
        console.debug("Managed object with external id " + externalId + " does not exists.");
        throw error;
      }
    );
    return data;
  }

  async createIdentidyForDevice(deviceId:string, externalId:string): Promise<IExternalIdentity>{
    const identity: IExternalIdentity = {
            type: FLEXY_SERIALTYPE,
            externalId: externalId,
            managedObject: {
              id: deviceId
            }
          };
    const {data, res} = await this.identityService.create(identity);
    return data;
  }
  //--------

  // DeviceRegistrationService
  async getDeviceRequestRegistration(): Promise<IDeviceRegistration[]>{
    const filter: object = {
           pageSize: 1000,
           withTotalPages: true
         };
    const {data, res, paging} = await this.deviceRegistration.list(filter);
    return data;
  }

  async createDeviceRequestRegistration(id:string): Promise<IDeviceRegistration>{
    const registrationObject: IDeviceRegistrationCreate = {
            id: id,
          };
    const {data, res} = await this.deviceRegistration.create(registrationObject);
    return data;
  }

  async deleteDeviceRequestRegistration(id:string){
    const {data, res} = await this.deviceRegistration.delete(id);
    return data;
  }

  async requestDeviceCredentials(id:string): Promise<IDeviceCredentials>{

    const options: IDeviceBootstrapOptions = {
      //basicAuthToken: 'Basic dGVuYW50L3VzZXJuYW1lOnBhc3N3b3Jk',
      basicAuth: {
        user: 'devicebootstrap',
        pass: 'Fhdt1bb1f'
      }
    };
    const {data, res} = await this.deviceRegistration.bootstrap(id, options);
    return data;
  }

  async acceptDeviceRequest(id:string){
    const {data, res} = await this.deviceRegistration.accept(id);
    return data;
  }
  //--------
}
