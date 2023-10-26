import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressTrackerComponent } from './progress-tracker/progress-tracker.component';
import { RouterModule } from '@angular/router';
import { ProgressDisplayComponent } from './progress-display/progress-display.component';
import { CoreModule } from '@c8y/ngx-components';
import { ProgressGroupComponent } from './progress-group/progress-group.component';

@NgModule({
  imports: [
    CoreModule,
    CommonModule,
    RouterModule.forChild([
      {
        path: 'progress',
        component: ProgressDisplayComponent,
      },
    ]),
  ],
  declarations: [ProgressDisplayComponent, ProgressTrackerComponent, ProgressGroupComponent],
})
export class ProgressTrackerModule {}
