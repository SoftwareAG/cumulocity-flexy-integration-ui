import { NgModule, Provider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { HOOK_NAVIGATOR_NODES, NavigatorNode } from '@c8y/ngx-components';
import { CoreModule } from '@c8y/ngx-components';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { FLEXY_REGISTRATION_PATH } from './../constants/flexy-integration.constants';
import { EwonFlexyOverviewComponent } from './overview/ewon-flexy-overview.component';

const moduleRoutes: Routes = [
  {
    path: FLEXY_REGISTRATION_PATH,
    component: EwonFlexyOverviewComponent
  }
];
const moduleNavigation: Provider[] = [
  {
    provide: HOOK_NAVIGATOR_NODES,
    useValue: [
      {
        label: 'Flexy Registration',
        path: FLEXY_REGISTRATION_PATH,
        icon: 'wi-fi-router',
        priority: -1,
        routerLinkExact: false
      }
    ] as NavigatorNode[],
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
  declarations: [EwonFlexyOverviewComponent],
  entryComponents: [EwonFlexyOverviewComponent],
  providers: [...moduleNavigation]
})
export class FlexyRegistrationModule {}
