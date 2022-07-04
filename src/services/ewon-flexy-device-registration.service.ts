import { Injectable } from '@angular/core';
import {
  DeviceRegistrationService,
  IDeviceBootstrapOptions,
  IDeviceCredentials,
  IDeviceRegistration,
  IDeviceRegistrationCreate,
  IExternalIdentity,
  IIdentified,
  IManagedObject
} from '@c8y/client';
import { IdentityService, InventoryService } from '@c8y/ngx-components/api';
import { FLEXY_DEVICETYPE, FLEXY_EXTERNALID_TALK2M_PREFIX } from '@constants/flexy-integration.constants';
import { EwonFlexyStructure } from '@interfaces/flexy.interface';
import { DevlogService } from './devlog.service';

@Injectable({ providedIn: 'root' })
export class EWONFlexyDeviceRegistrationService extends DevlogService {
  private registrations: IDeviceRegistration[] = [];
  private registrationsRequested: number = null;

  constructor(
    private inventoryService: InventoryService,
    private identityService: IdentityService,
    private deviceRegistration: DeviceRegistrationService
  ) {
    super();
    this.devLogEnabled = false;
    this.devLogPrefix = 'EFDR.S';
  }

  // InventoryService
  async createDeviceInventory(ewon: EwonFlexyStructure): Promise<IManagedObject> {
    let partialManagedObj: Partial<IManagedObject> = {
      pageSize: 1,
      withTotalPages: true,
      name: (ewon && ewon.name) || 'Unknown name',
      type: FLEXY_DEVICETYPE,
      c8y_IsDevice: {},
      talk2m: {
        id: (ewon && ewon.id) || '',
        encodedName: (ewon && ewon.encodedName) || '',
        description: (ewon && ewon.description) || '',
        pool: (ewon && ewon.pool) || '',
        m2webServer: (ewon && ewon.m2webServer) || '',
        ewonServices: [],
        customAttributes: [],
        lanDevices: []
      }
    };
    if (ewon && ewon.customAttributes) {
      for (const attribute of ewon.customAttributes) {
        partialManagedObj.talk2m.customAttributes.push(attribute);
      }
    }
    if (ewon && ewon.ewonServices) {
      for (const services of ewon.ewonServices) {
        partialManagedObj.talk2m.ewonServices.push(services);
      }
    }
    if (ewon && ewon.lanDevices) {
      for (const lanDevice of ewon.lanDevices) {
        partialManagedObj.talk2m.lanDevices.push(lanDevice);
      }
    }

    const { data } = await this.inventoryService.create(partialManagedObj);
    return data;
  }

  async getDeviceGroupInventoryList(): Promise<IManagedObject[]> {
    const filter: object = {
      pageSize: 100, withTotalPages: true, fragmentType: 'c8y_IsDeviceGroup'
    };
    const { data } = await this.inventoryService.list(filter);
    return data;
  }

  async getGroupInventoryListOfDevice(deviceId: string): Promise<IManagedObject[]> {
    const filter: object = {
      pageSize: 100,
      childAssetId: deviceId,
      withTotalPages: false,
      withChildren: false,
      withParents: true
    };

    const { data } = await this.inventoryService.list(filter);
    return data;
  }

  async getDeviceEwonFlexyInventoryList(): Promise<IManagedObject[]> {
    const filter: object = {
      pageSize: 100,
      withTotalPages: true,
      type: FLEXY_DEVICETYPE
    };
    const { data } = await this.inventoryService.list(filter);
    return data;
  }

  async createDeviceGroupInventory(pool: string): Promise<IManagedObject> {
    const partialManagedObj: Partial<IManagedObject> = {
      pageSize: 1,
      withTotalPages: true,
      name: pool,
      type: 'c8y_DeviceGroup',
      c8y_IsDeviceGroup: {}
    };
    const { data } = await this.inventoryService.create(partialManagedObj);
    return data;
  }

  async addGroupChildAssetToDevice(groupId: string, deviceId: string): Promise<IIdentified> {
    const { data } = await this.inventoryService.childAssetsAdd(deviceId, groupId);
    return data;
  }

  async setDevivceOwnerExternalId(externalId: string, mo_id: string): Promise<IManagedObject> {
    const partialUpdateObject: Partial<IManagedObject> = {
      id: mo_id,
      owner: 'device_' + externalId
    };

    const { data } = await this.inventoryService.update(partialUpdateObject);
    return data;
  }
  //--------

  // IdentityService
  async isDeviceRegistered(externalId: string, prefix: string, externalType: string): Promise<boolean> {
    const identity: IExternalIdentity = {
      type: externalType,
      externalId: prefix + externalId
    };
    const data = await this.identityService.detail(identity).then(
      (result) => {
        return true;
      },
      (error) => {
        return false;
      }
    );
    return data;
  }

  async getExternalIdsOfManagedObject(id: string): Promise<IExternalIdentity[]> {
    const { data } = await this.identityService.list(id);
    return data;
  }

  async createIdentidyForDevice(
    deviceId: string,
    externalId: string,
    prefix: string,
    externalType: string
  ): Promise<IExternalIdentity> {
    const identity: IExternalIdentity = {
      type: externalType,
      externalId: prefix + externalId,
      managedObject: {
        id: deviceId
      }
    };
    const { data } = await this.identityService.create(identity);
    return data;
  }
  //--------

  // DeviceRegistrationService
  async getDeviceRequestRegistration(ignoreCache = false): Promise<IDeviceRegistration[]> {
    const now = new Date().getTime();
    const filter: object = {
      pageSize: 1000,
      withTotalPages: true
    };

    // use cache
    if (!ignoreCache && !!this.registrationsRequested && this.registrationsRequested - 300 < now) {
      return this.registrations;
    }

    const { data } = await this.deviceRegistration.list(filter);
    this.registrations = data;
    this.registrationsRequested = now;

    return data;
  }

  async createDeviceRequestRegistration(id: string, prefix = FLEXY_EXTERNALID_TALK2M_PREFIX): Promise<IDeviceRegistration> {
    const registrationObject: IDeviceRegistrationCreate = {
      id: prefix + id
    };
    const { data } = await this.deviceRegistration.create(registrationObject);
    return data;
  }

  async requestDeviceCredentials(id: string, prefix = FLEXY_EXTERNALID_TALK2M_PREFIX): Promise<IDeviceCredentials> {
    const options: IDeviceBootstrapOptions = {
      //basicAuthToken: 'Basic dGVuYW50L3VzZXJuYW1lOnBhc3N3b3Jk',
      basicAuth: {
        user: 'devicebootstrap',
        pass: 'Fhdt1bb1f'
      }
    };
    const { data } = await this.deviceRegistration.bootstrap(prefix + id, options);
    return data;
  }

  async acceptDeviceRequest(id: string, prefix = FLEXY_EXTERNALID_TALK2M_PREFIX) {
    const { data } = await this.deviceRegistration.accept(prefix + id);
    return data;
  }
  //--------

}
