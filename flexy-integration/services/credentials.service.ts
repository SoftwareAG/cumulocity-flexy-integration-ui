import { Injectable } from '@angular/core';
import { ITenantOption, TenantOptionsService, UserService } from '@c8y/client';
import { FLEXY_TENANTOPTIONS_CATEGORY } from '@flexy/constants/flexy-integration.constants';
import { FlexySettings } from '@flexy/models/flexy.model';

@Injectable({ providedIn: 'root' })
export class CerdentialsService {
  constructor(private tenantOptionsService: TenantOptionsService, private userService: UserService) {}

  protected async getCategory(): Promise<string> {
    const user = await this.userService.current();
    const base64 = btoa(user.data.id).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return FLEXY_TENANTOPTIONS_CATEGORY + '_' + base64;
  }

  async updateCredentials(config: Partial<FlexySettings>): Promise<void> {
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

  async getConfig(): Promise<FlexySettings> {
    const options = await this.getCredentials();
    const config: Partial<FlexySettings> = {};

    if (!options.length) {
      return null;
    }
    options.forEach((option) => (config[option.key] = option.value));

    return config;
  }
}
