import { FLEXY_SERIALTYPE } from './../constants/flexy-integration.constants';
import { Injectable } from "@angular/core";
import { IManagedObject, IExternalIdentity, DeviceRegistrationService } from "@c8y/client";
import { InventoryService, IdentityService } from "@c8y/ngx-components/api";

@Injectable()
export class EWONFlexyDeviceRegistrationService {
  constructor(
    private inventoryService: InventoryService,
    private identityService: IdentityService,
    private deviceRegistration: DeviceRegistrationService
  ) {}


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

  async createDeviceInventory(name:string): Promise<IManagedObject> {

    const filter: object = {
             pageSize: 1,
             withTotalPages: true,
             name: name,
             type:  "c8y_MQTTDevice"
           };   
    // Does device exists bases on name and type?
    const { data, res } = await this.inventoryService.list(filter).then(
        (result) => {
            return result.data[0];
        }, async (not_exists) => {
            const partialManagedObj: Partial<IManagedObject> = {
                c8y_IsDevice: {},
                name: name,
                type: "c8y_MQTTDevice",
              };
              const { data, res } = await this.inventoryService.create(partialManagedObj);
              return data;
        }
    );
    return data;
  }

  async updateDeviceExternalId(deviceId: string,  externalId: string ): Promise<IExternalIdentity> {
    const identity: IExternalIdentity = {
      type: "flexy_id",
      externalId: externalId,
      managedObject: {
        id: deviceId,
      },
    };

    const { data, res } = await this.identityService.create(identity);

    return data;
  }
}
