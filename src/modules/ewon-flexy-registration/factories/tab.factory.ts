import { FLEXY_PATH, FLEXY_SETTINGS_PATH, FLEXY_REGISTRATION_PATH } from '../../../constants/flexy-integration.constants';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Tab, TabFactory } from '@c8y/ngx-components';
import { merge, Observable } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';

@Injectable()
export class FlexyTabFactory implements TabFactory {
  constructor(private router: Router) {}

  get(activatedRoute?: ActivatedRoute): Tab[] {
    if (this.router.url.includes(`${FLEXY_PATH}`)) {
      return [
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
        }
      ]
    }
    return [];
  }
}