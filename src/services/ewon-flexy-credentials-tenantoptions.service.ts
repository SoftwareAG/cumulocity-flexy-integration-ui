import { FlexySettings } from './../interfaces/ewon-flexy-registration.interface';
import { Injectable } from "@angular/core";
import { AlertService } from "@c8y/ngx-components";
import { TenantOptionsService, ITenantOption } from "@c8y/client";
import { FLEXY_TENANTOPTIONS_CATEGORY } from "../constants/flexy-integration.constants";

@Injectable()
export class EWONFlexyCredentialsTenantoptionsService {
  constructor(
    private tenantOptionsService: TenantOptionsService,
    private alert: AlertService
  ) {}

  async updateCredentials(config: any) {

    const listKeys = Object.keys(config)
    for await (const iterate of listKeys) {

      if (iterate === "password"){
        continue;
      }
      const option: ITenantOption = {
        category: FLEXY_TENANTOPTIONS_CATEGORY,
        key: iterate,
        value: config[iterate],
      };
      const { data, res } = await this.tenantOptionsService.update(option);
    }
    
  }

  async getCredentials(): Promise<ITenantOption[]> {
      const filter = {
      category: FLEXY_TENANTOPTIONS_CATEGORY,
      pageSize: 100,
      withTotalPages: true,
    };
    const { data, res, paging } = await this.tenantOptionsService.list(filter);
    const filteredData = data
      .filter((tmp) => tmp.category === FLEXY_TENANTOPTIONS_CATEGORY)
      .map((tmp) => tmp as ITenantOption)
      .filter((tmp) => tmp.key != "credentials.password");
      
    return filteredData;
  }
}
