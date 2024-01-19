import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  CoreModule, FormsModule,
  gettext,
  hookActionBar,
  hookComponent,
  hookNavigator,
  hookRoute
} from '@c8y/ngx-components';
import { ProgressTrackerModule } from '@progress/progress-tracker.module';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import {
  AgentInstallOverlayComponent,
  BulkRegistrationComponent,
  DataMailboxDownloadComponent,
  LoadingSpinnerComponent,
  RegisteredCellRendererComponent,
  RegisteredColumn,
  RegistrationDeviceGridComponent,
  SettingsComponent,
  SynchjobCardComponent,
  SynchjobModalComponent,
  Talk2mConnectionStatusComponent
} from './components';
import { FLEXY_DATAMAILBOX_PATH, FLEXY_PATH, FLEXY_REGISTRATION_PATH } from './constants/flexy-integration.constants';
import {
  FlexyNavigationFactory, Talk2mConnectionStatusActionFactory
} from './factories';

const components = [
  AgentInstallOverlayComponent,
  BulkRegistrationComponent,
  DataMailboxDownloadComponent,
  LoadingSpinnerComponent,
  RegistrationDeviceGridComponent,
  SettingsComponent,
  SynchjobCardComponent,
  SynchjobModalComponent,
  Talk2mConnectionStatusComponent,
  // grid
  // - columns
  RegisteredColumn,
  // - cell renderer
  RegisteredCellRendererComponent
];

const hooks = [
  // plugin
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
      // redirects
      {
        path: '',
        pathMatch: 'full',
        redirectTo: FLEXY_REGISTRATION_PATH
      },
      // paths
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
  hookNavigator(FlexyNavigationFactory),
  // hookNavigator({
  //   useClass: FlexyTabFactory,
  //   multi: true
  // })

  // action bar
  hookActionBar(Talk2mConnectionStatusActionFactory)
];

@NgModule({
  entryComponents: [BulkRegistrationComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    BsDropdownModule,
    CoreModule,
    TooltipModule,
    ButtonsModule,
    ProgressTrackerModule
  ],
  declarations: components,
  providers: [...hooks]
})
export class FlexyIntegrationPluginModule {}
