import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBarItem, ExtensionFactory } from '@c8y/ngx-components';
import { Talk2mConnectionStatusComponent } from '@flexy/components/talk2m-connection-status/talk2m-connection-status.component';
import { FLEXY_PATH } from '@flexy/constants/flexy-integration.constants';

@Injectable()
export class Talk2mConnectionStatusActionFactory implements ExtensionFactory<ActionBarItem> {
  private readonly actions: ActionBarItem[] = [
    {
      placement: 'right',
      priority: 1,
      template: Talk2mConnectionStatusComponent
    }
  ];

  constructor(private router: Router) {}

  async get(): Promise<ActionBarItem[]> {
    return (this.router.url.includes(`/${FLEXY_PATH}/`)) ? this.actions : [];
  }
}
