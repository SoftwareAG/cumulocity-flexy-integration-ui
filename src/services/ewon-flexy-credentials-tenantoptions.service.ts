import { Injectable } from "@angular/core";
import { AlertService } from "@c8y/ngx-components";
import { TenantOptionsService, ITenantOption, UserService, IUser, TenantService } from "@c8y/client";
import { FLEXY_TENANTOPTIONS_CATEGORY } from "../constants/flexy-integration.constants";

@Injectable()
export class EWONFlexyCredentialsTenantoptionsService {
  constructor(
    private tenantOptionsService: TenantOptionsService,
    private tenantService: TenantService,
    private userService: UserService,
    private alert: AlertService
  ) {}


  async getCurrentTenantId() : Promise<string>{

    const tenant = await this.tenantService.current()
    return tenant.data.name;
  }

  protected async getBase64Userid(): Promise<string>{
    const user = await this.userService.current();
    const base64 = btoa(user.data.id).replace("=","").replace("+","-").replace("/","_");
    return base64;
  }

  async updateCredentials(config: any) {

    const base64 = await this.getBase64Userid();

    const listKeys = Object.keys(config)
    for (const iterate of listKeys) {

      if (iterate === "password"){
        continue;
      }
      const option: ITenantOption = {
        category: FLEXY_TENANTOPTIONS_CATEGORY + '_' + base64,
        key: iterate,
        value: config[iterate],
      };
      this.tenantOptionsService.update(option);
    }
  }

  async getCredentials(): Promise<ITenantOption[]> {

    const base64 = await this.getBase64Userid();
    const filter = {
      category: FLEXY_TENANTOPTIONS_CATEGORY + '_' + base64,
      pageSize: 100,
      withTotalPages: true,
    };
    const { data, res, paging } = await this.tenantOptionsService.list(filter);
    const filteredData = data
      .filter((tmp) => tmp.category === FLEXY_TENANTOPTIONS_CATEGORY + '_' + base64)
      .map((tmp) => tmp as ITenantOption)
      .filter((tmp) => tmp.key != "credentials.password");
      
    return filteredData;
  }
}
