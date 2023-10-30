import { CommonModule } from '@angular/common';
import { NgModule, Provider } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { CoreModule, HOOK_NAVIGATOR_NODES, HOOK_TABS } from '@c8y/ngx-components';
import {
  FLEXY_DATAMAILBOX_PATH, FLEXY_PATH, FLEXY_REGISTRATION_PATH, FLEXY_SETTINGS_PATH
} from '@constants/flexy-integration.constants';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { AgentInstallOverlayComponent } from '../../../flexy-integration/components/agent-install-overlay/agent-install-overlay.component';
import { BulkRegistrationComponent } from '../../../flexy-integration/components/bulk-registration/bulk-registration.component';
import { RegistrationModalComponent } from '../../../flexy-integration/components/bulk-registration/registration-modal/registration-modal.component';
import { DataMailboxDownloadComponent } from './datamailbox-download/datamailbox-download.component';
import { SynchjobCardComponent } from './datamailbox-download/synchjob-card/synchjob-card.component';
import { SynchjobModalComponent } from './datamailbox-download/synchjob-modal/synchjob-modal.component';
import { FlexyNavigatorNodeFactory } from './factories/navigator-node.factory';
import { FlexyTabFactory } from './factories/tab.factory';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { SettingsComponent } from './settings/settings.component';

const moduleRoutes: Routes = [
  {
    path: FLEXY_PATH,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: FLEXY_SETTINGS_PATH
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
    ReactiveFormsModule,
    BsDropdownModule,
    RouterModule.forChild(moduleRoutes),
    CoreModule,
    TooltipModule,
    ButtonsModule
  ],
  declarations: [
    SettingsComponent,
    BulkRegistrationComponent,
    DataMailboxDownloadComponent,
    SynchjobCardComponent,
    SynchjobModalComponent,
    RegistrationModalComponent,
    AgentInstallOverlayComponent,
    LoadingSpinnerComponent
  ],
  entryComponents: [
    SettingsComponent,
    BulkRegistrationComponent,
    DataMailboxDownloadComponent,
    SynchjobCardComponent,
    SynchjobModalComponent,
    RegistrationModalComponent,
    AgentInstallOverlayComponent
  ],
  providers: [...moduleNavigation]
})
export class FlexyRegistrationModule {}
