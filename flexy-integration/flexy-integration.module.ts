import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CoreModule, FormsModule, gettext, hookComponent, hookNavigator, hookRoute } from '@c8y/ngx-components';
import { ProgressTrackerModule } from '@progress/progress-tracker.module';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import {
  AgentInstallOverlayComponent,
  BulkRegistrationComponent,
  DataMailboxDownloadComponent,
  // FlexyTabFactory,
  LoadingSpinnerComponent,
  RegistrationModalComponent,
  SettingsComponent,
  SynchjobCardComponent,
  SynchjobModalComponent
} from './components';
import {
  FLEXY_DATAMAILBOX_PATH,
  FLEXY_PATH,
  FLEXY_REGISTRATION_PATH,
  FLEXY_SETTINGS_PATH
} from './constants/flexy-integration.constants';

const declarations = [
  AgentInstallOverlayComponent,
  BulkRegistrationComponent,
  DataMailboxDownloadComponent,
  LoadingSpinnerComponent,
  RegistrationModalComponent,
  SettingsComponent,
  SynchjobCardComponent,
  SynchjobModalComponent
];

const providers = [
  hookComponent({
    id: 'hms.flex-integration.plugin',
    label: gettext('HMS Flexy Untegration Plugin'),
    description: gettext('Plugin description text'),
    component: BulkRegistrationComponent
  }),
  // routes
  hookRoute({
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
  }),
  // navigation
  hookNavigator({
    parent: gettext('Devices'),
    priority: 9999,
    path: FLEXY_PATH,
    label: 'Flexy Registration',
    icon: 'wi-fi-router'
  })
  // hookNavigator({
  //   useClass: FlexyTabFactory,
  //   multi: true
  // })
];

@NgModule({
  entryComponents: [BulkRegistrationComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BsDropdownModule,
    CoreModule,
    TooltipModule,
    ButtonsModule,
    ProgressTrackerModule
  ],
  declarations,
  providers
})
export class FlexyIntegrationPluginModule {}
