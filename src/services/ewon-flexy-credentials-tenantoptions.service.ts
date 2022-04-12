import { Injectable } from '@angular/core';
import { TenantOptionsService, ITenantOption, UserService, TenantService } from '@c8y/client';
import { FLEXY_TENANTOPTIONS_CATEGORY } from '@constants/flexy-integration.constants';

@Injectable()
export class EWONFlexyCredentialsTenantoptionsService {
  constructor(
    private tenantOptionsService: TenantOptionsService,
    private tenantService: TenantService,
    private userService: UserService
  ) {}

  async getCurrentTenantId(): Promise<string> {
    const tenant = await this.tenantService.current();
    return tenant.data.name;
  }

  protected async getCategory(): Promise<string> {
    const user = await this.userService.current();
    const base64 = btoa(user.data.id).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return FLEXY_TENANTOPTIONS_CATEGORY + '_' + base64;
  }

  async updateCredentials(config: any) {
    const category = await this.getCategory();

    const listKeys = Object.keys(config);
    for (const iterate of listKeys) {
      if (iterate === 'password') {
        continue;
      }
      const option: ITenantOption = {
        category,
        key: iterate,
        value: config[iterate]
      };
      this.tenantOptionsService.update(option);
    }
  }

  async getCredentials(): Promise<ITenantOption[]> {
    const category = await this.getCategory();
    const filter = {
      category,
      pageSize: 100,
      withTotalPages: true
    };
    const { data } = await this.tenantOptionsService.list(filter);
    const filteredData = data
      .filter((tmp) => tmp.category === category)
      .map((tmp) => tmp as ITenantOption)
      .filter((tmp) => tmp.key != 'credentials.password');

    return filteredData;
  }
}
