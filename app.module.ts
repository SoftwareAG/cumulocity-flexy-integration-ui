import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as NgRouterModule } from '@angular/router';
import { UpgradeModule as NgUpgradeModule } from '@angular/upgrade/static';
import { CoreModule, RouterModule } from '@c8y/ngx-components';
import { AssetsNavigatorModule } from '@c8y/ngx-components/assets-navigator';
import { BinaryFileDownloadModule } from '@c8y/ngx-components/binary-file-download';
import { DeviceGridExampleModule } from '@c8y/ngx-components/device-grid-example';
import { DeviceProfileModule } from '@c8y/ngx-components/device-profile';
import { OperationsModule } from '@c8y/ngx-components/operations';
import { ImpactProtocolModule } from '@c8y/ngx-components/protocol-impact';
import { LoraProtocolModule } from '@c8y/ngx-components/protocol-lora';
import { OpcuaProtocolModule } from '@c8y/ngx-components/protocol-opcua';
import { RepositoryModule } from '@c8y/ngx-components/repository';
import { SearchModule } from '@c8y/ngx-components/search';
import { SubAssetsModule } from '@c8y/ngx-components/sub-assets';
import { TrustedCertificatesModule } from '@c8y/ngx-components/trusted-certificates';
import {
  DashboardUpgradeModule,
  HybridAppModule,
  UpgradeModule,
  UPGRADE_ROUTES
} from '@c8y/ngx-components/upgrade';
import { ProgressTrackerModule } from '@modules/progress-tracker/progress-tracker.module';
import { FlexyRegistrationModule } from './src/modules/ewon-flexy-registration/ewon-flexy-registration.module';

const c8yModules = [
  RouterModule.forRoot(),
  CoreModule.forRoot(),
  AssetsNavigatorModule.config({
    smartGroups: true
  }),
  OperationsModule,
  OpcuaProtocolModule,
  ImpactProtocolModule,
  TrustedCertificatesModule,
  DeviceGridExampleModule,
  DashboardUpgradeModule,
  RepositoryModule,
  DeviceProfileModule,
  BinaryFileDownloadModule,
  SearchModule,
  LoraProtocolModule,
  SubAssetsModule,
];

const customModules = [
  FlexyRegistrationModule,
  ProgressTrackerModule
];

@NgModule({
  imports: [
    // Upgrade module must be the first
    UpgradeModule,
    BrowserAnimationsModule,
    NgRouterModule.forRoot([...UPGRADE_ROUTES], { enableTracing: false, useHash: true }),
    NgUpgradeModule,
    ...c8yModules,
    ...customModules
  ],
  providers: []
})
export class AppModule extends HybridAppModule {
  constructor(protected upgrade: NgUpgradeModule) {
    super();
  }
}
