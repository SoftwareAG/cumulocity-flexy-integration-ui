import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject, InventoryService } from '@c8y/client';
import { IdentityService } from '@c8y/ngx-components/api';

@Injectable({ providedIn: 'root' })
export class ExternalIDService {
  constructor(private identityService: IdentityService, private inventoryService: InventoryService) {}

  async getExternalID(externalId: string, type: string): Promise<IExternalIdentity> {
    return this.identityService
      .detail({
        type,
        externalId
      })
      .then((res) => res.data);
  }

  async getDeviceByIdentity(identity: IExternalIdentity): Promise<IManagedObject> {
    return this.inventoryService.detail(identity.managedObject.id).then((res) => res.data);
  }

  async getDeviceByExternalID(externalId: string, externalType: string): Promise<IManagedObject> {
    const identity = await this.getExternalID(externalId, externalType);
    return this.getDeviceByIdentity(identity);
  }

  async getExternalIDsByDeviceID(id: string): Promise<IExternalIdentity[]> {
    return this.identityService.list(id).then((res) => res.data);
  }

  async getExternalIDsForDevice(device: IManagedObject): Promise<IExternalIdentity[]> {
    return this.getExternalIDsByDeviceID(device.id);
  }

  async createExternalIDForDevice(
    deviceId: string,
    externalId: string,
    externalType: string
  ): Promise<IExternalIdentity> {
    return this.identityService
      .create({
        type: externalType,
        externalId: externalId,
        managedObject: {
          id: deviceId
        }
      })
      .then((res) => res.data);
  }
}
