import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressTrackerComponent } from './progress-tracker/progress-tracker.component';
import { RouterModule } from '@angular/router';
import { ProgressDisplayComponent } from './progress-display/progress-display.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'progress',
        component: ProgressDisplayComponent,
      },
    ]),
  ],
  declarations: [ProgressDisplayComponent, ProgressTrackerComponent],
})
export class ProgressTrackerModule {}
