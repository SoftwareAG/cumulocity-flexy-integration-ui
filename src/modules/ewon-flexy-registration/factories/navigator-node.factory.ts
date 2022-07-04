import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigatorNode, NavigatorNodeFactory, gettext } from '@c8y/ngx-components';
import { FLEXY_PATH } from '@constants/flexy-integration.constants';

@Injectable()
export class FlexyNavigatorNodeFactory implements NavigatorNodeFactory {
  node: NavigatorNode;
  constructor() {
    this.node = new NavigatorNode({
      label: gettext('Flexy Registration'),
      path: FLEXY_PATH,
      icon: 'wi-fi-router',
      priority: 9999,
      routerLinkExact: false,
      parent: gettext('Devices')
    });
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.node;
  }
}
