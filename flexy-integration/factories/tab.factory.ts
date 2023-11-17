import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Tab, TabFactory } from '@c8y/ngx-components';
import {
  FLEXY_DATAMAILBOX_PATH,
  FLEXY_PATH,
  FLEXY_REGISTRATION_PATH
} from '@flexy/constants/flexy-integration.constants';
import { MicroserviceIntegrationService } from '@flexy/services';

@Injectable()
export class FlexyTabFactory implements TabFactory {
  constructor(private router: Router, private c8yMicroservice: MicroserviceIntegrationService) {}

  async get(): Promise<Tab[]> {
    if (this.router.url.includes(`${FLEXY_PATH}`)) {
      const isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
      let tabs = [
        {
          path: `${FLEXY_PATH}/${FLEXY_REGISTRATION_PATH}`,
          label: 'Registration',
          icon: 'c8y-icon c8y-icon-device-connect',
          priority: -1
        },
        {
          path: `${FLEXY_PATH}/${FLEXY_DATAMAILBOX_PATH}`,
          label: 'Synchronisation',
          icon: 'cloud-connection',
          priority: -2
        }
      ];
      if (!isMicroserviceEnabled) {
        tabs = tabs.slice(0, -1);
      }
      return tabs;
    }
    return [];
  }
}
