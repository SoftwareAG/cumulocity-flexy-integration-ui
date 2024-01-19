import { Injectable } from '@angular/core';
import { gettext, NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';
import { FLEXY_PATH } from '@flexy/constants/flexy-integration.constants';

@Injectable()
export class FlexyNavigationFactory implements NavigatorNodeFactory {
  async get(): Promise<NavigatorNode> {
    return new NavigatorNode({
      parent: gettext('Devices'),
      featureId: 'flexy-registration',
      priority: 9999,
      path: FLEXY_PATH,
      label: 'Flexy Registration',
      icon: 'wi-fi-router'
    });
  }
}
