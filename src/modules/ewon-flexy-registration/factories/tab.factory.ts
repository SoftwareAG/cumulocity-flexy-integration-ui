import { FLEXY_DATAMAILBOX_PATH } from './../../../constants/flexy-integration.constants';
import { FLEXY_PATH, FLEXY_SETTINGS_PATH, FLEXY_REGISTRATION_PATH } from '../../../constants/flexy-integration.constants';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Tab, TabFactory } from '@c8y/ngx-components';
import { merge, Observable } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';
import { MicroserviceIntegrationService } from '../../../services/c8y-microservice-talk2m-integration.service';

@Injectable()
export class FlexyTabFactory implements TabFactory {
  constructor(private router: Router,
    private c8yMicroservice: MicroserviceIntegrationService) {}

  async get(activatedRoute?: ActivatedRoute): Promise<Tab[]> {
    if (this.router.url.includes(`${FLEXY_PATH}`)) {

      const isMicroserviceEnabled = await this.c8yMicroservice.isMicroserviceEnabled();
      let tabs =  [
        {
          path: `${FLEXY_PATH}/${FLEXY_SETTINGS_PATH}`,
          label: 'Settings',
          icon: 'cog'
        },
        {
          path: `${FLEXY_PATH}/${FLEXY_REGISTRATION_PATH}`,
          label: 'Registration',
          icon: 'cloud-connection',
          priority: -1,
        },
        {
          path: `${FLEXY_PATH}/${FLEXY_DATAMAILBOX_PATH}`,
          label: 'Data Mailbox',
          icon: 'cloud-download',
          priority: -2,
        }
      ]
      if (!isMicroserviceEnabled){
        tabs = tabs.slice(0 , -1);
      }
      return tabs;
    }
    return [];
  }
}