import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject, InventoryService } from '@c8y/client';
import { IdentityService } from '@c8y/ngx-components/api';
import { DevlogService } from './devlog.service';

@Injectable({
  providedIn: 'root'
})
export class ExternalIDService extends DevlogService {
  constructor(private identityService: IdentityService, private inventoryService: InventoryService) {
    super();
    this.devLogEnabled = false;
    this.devLogPrefix = 'EID.S';
  }

  async getExternalID(externalId: string, type: string): Promise<IExternalIdentity> {
    this.devLog('getExternalID', { externalId, type });
    return this.identityService
      .detail({
        type,
        externalId
      })
      .then((res) => res.data);
  }

  async getDeviceByIdentity(identity: IExternalIdentity): Promise<IManagedObject> {
    this.devLog('getDeviceByIdentity', { identity });
    return this.inventoryService.detail(identity.managedObject.id).then((res) => res.data);
  }

  async getDeviceByExternalID(externalId: string, externalType: string): Promise<IManagedObject> {
    this.devLog('getDeviceByExternalID', { externalId, externalType });
    const identity = await this.getExternalID(externalId, externalType);
    return this.getDeviceByIdentity(identity);
  }

  async getExternalIDsByDeviceID(id: string): Promise<IExternalIdentity[]> {
    this.devLog('getExternalIDsByDeviceID', { id });
    return this.identityService.list(id).then((res) => res.data);
  }

  async getExternalIDsForDevice(device: IManagedObject): Promise<IExternalIdentity[]> {
    this.devLog('getExternalIDsForDevice', { device });
    return this.getExternalIDsByDeviceID(device.id);
  }

  async createExternalIDForDevice(
    deviceId: string,
    externalId: string,
    externalType: string
  ): Promise<IExternalIdentity> {
    this.devLog('createExternalIDForDevice', { deviceId, externalId, externalType });
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
