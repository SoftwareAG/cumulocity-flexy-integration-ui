import { Injectable } from "@angular/core";
import { IManagedObject } from "@c8y/client";
import { InventoryService } from "@c8y/ngx-components/api";
import { DM_FRAGMENTTYPE_MO } from './../constants/flexy-integration.constants';

@Injectable()
export class EWONFlexySynchronizeJobService {

    constructor(
        private inventoryService: InventoryService
      ) {}

    async listOnloadingJobs(): Promise<IManagedObject[]> {
        const filter: object = {
                 pageSize: 100,
                 withTotalPages: true,
                 fragmentType: DM_FRAGMENTTYPE_MO
               };
            
        const {data, res, paging} = await this.inventoryService.list(filter);

        return data;
    }
}