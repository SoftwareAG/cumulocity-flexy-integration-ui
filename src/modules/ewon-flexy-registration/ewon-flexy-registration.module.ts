import { FlexyTabFactory } from './factories/tab.factory';
import { FlexyNavigatorNodeFactory } from './factories/navigator-node.factory';
import { NgModule, Provider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { HOOK_NAVIGATOR_NODES, HOOK_TABS } from '@c8y/ngx-components';
import { CoreModule } from '@c8y/ngx-components';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { FLEXY_PATH, FLEXY_SETTINGS_PATH, FLEXY_REGISTRATION_PATH, FLEXY_DATAMAILBOX_PATH } from '../../constants/flexy-integration.constants';
import { SettingsComponent } from './settings/settings.component';
import { BulkRegistrationComponent } from './bulk-registration/bulk-registration.component';
import { DataMailboxDownloadComponent } from './datamailbox-download/datamailbox-download.component';

const moduleRoutes: Routes = [
  {
    path: FLEXY_PATH,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: FLEXY_SETTINGS_PATH,
      },
      {
        path: FLEXY_SETTINGS_PATH,
        component: SettingsComponent
      },
      {
        path: FLEXY_REGISTRATION_PATH,
        component: BulkRegistrationComponent
      },
      {
        path: FLEXY_DATAMAILBOX_PATH,
        component: DataMailboxDownloadComponent
      }
    ]
  }
];
const moduleNavigation: Provider[] = [
  {
    provide: HOOK_NAVIGATOR_NODES,
    useClass: FlexyNavigatorNodeFactory,
    multi: true
  },
  {
    provide: HOOK_TABS,
    useClass: FlexyTabFactory,
    multi: true
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    RouterModule.forChild(moduleRoutes),
    CoreModule,
    TooltipModule,
  ],
  declarations: [SettingsComponent, BulkRegistrationComponent,DataMailboxDownloadComponent],
  entryComponents: [SettingsComponent, BulkRegistrationComponent,DataMailboxDownloadComponent],
  providers: [...moduleNavigation]
})
export class FlexyRegistrationModule {}
