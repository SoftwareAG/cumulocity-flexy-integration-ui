import { FlexyTabFactory } from './factories/tab.factory';
import { FlexyNavigatorNodeFactory } from './factories/navigator-node.factory';
import { NgModule, Provider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { HOOK_NAVIGATOR_NODES, HOOK_TABS } from '@c8y/ngx-components';
import { CoreModule } from '@c8y/ngx-components';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
// custom components
import { SettingsComponent } from './settings/settings.component';
import { BulkRegistrationComponent } from './bulk-registration/bulk-registration.component';
import { RegistrationModalComponent } from './bulk-registration/registration-modal/registration-modal.component';
import { DataMailboxDownloadComponent } from './datamailbox-download/datamailbox-download.component';
import { SynchjobCardComponent } from './datamailbox-download/synchjob-card/synchjob-card.component';
import { SynchjobModalComponent } from './datamailbox-download/synchjob-modal/synchjob-modal.component';
// singleton services
import { MicroserviceIntegrationService } from '../../services/c8y-microservice-talk2m-integration.service';
import { SyncOnloadJobService } from '../../services/synchronize-job.service';
import { RegisterFlexyManualService } from '../../services/register-flexy-manual.service';
import { EWONFlexyCredentialsTenantoptionsService } from '../../services/ewon-flexy-credentials-tenantoptions.service';
import { EWONFlexyDeviceRegistrationService } from '../../services/ewon-flexy-device-registration.service';
// navigation
import {
  FLEXY_PATH,
  FLEXY_SETTINGS_PATH,
  FLEXY_REGISTRATION_PATH,
  FLEXY_DATAMAILBOX_PATH,
} from '../../constants/flexy-integration.constants';

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
        component: SettingsComponent,
      },
      {
        path: FLEXY_REGISTRATION_PATH,
        component: BulkRegistrationComponent,
      },
      {
        path: FLEXY_DATAMAILBOX_PATH,
        component: DataMailboxDownloadComponent,
      },
    ],
  },
];
const moduleNavigation: Provider[] = [
  {
    provide: HOOK_NAVIGATOR_NODES,
    useClass: FlexyNavigatorNodeFactory,
    multi: true,
  },
  {
    provide: HOOK_TABS,
    useClass: FlexyTabFactory,
    multi: true,
  },
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
    ButtonsModule,
  ],
  declarations: [
    SettingsComponent,
    BulkRegistrationComponent,
    DataMailboxDownloadComponent,
    SynchjobCardComponent,
    SynchjobModalComponent,
    RegistrationModalComponent,
  ],
  entryComponents: [
    SettingsComponent,
    BulkRegistrationComponent,
    DataMailboxDownloadComponent,
    SynchjobCardComponent,
    SynchjobModalComponent,
    RegistrationModalComponent,
  ],
  providers: [
    ...moduleNavigation,
    MicroserviceIntegrationService,
    SyncOnloadJobService,
    RegisterFlexyManualService,
    EWONFlexyCredentialsTenantoptionsService,
    EWONFlexyDeviceRegistrationService,
  ],
})
export class FlexyRegistrationModule {}
