import { Component, Input } from '@angular/core';
import { ProgressTrack } from '../progress-tracker.models';
import { ProgressTrackerService } from '../progress-tracker.service';

@Component({
  selector: 'progress-tracker',
  templateUrl: './progress-tracker.component.html',
  styleUrls: ['./progress-tracker.component.less']
})
export class ProgressTrackerComponent {
  @Input() set key(key: ProgressTrack['key']) {
    if (key && (!this._key || this._key !== key)) {
      this._key = key;
      this.addTrack(key);
    }
  }

  get key(): ProgressTrack['key'] {
    return this.key;
  }

  _key?: ProgressTrack['key'];
  track?: ProgressTrack;

  constructor(private progressTrackerService: ProgressTrackerService) {}

  private addTrack(key = this.key) {
    const track = this.progressTrackerService.addTrack(key);

    track.subscribe((t) => this.trackUpdate(t));
  }

  private trackUpdate(t: ProgressTrack): void {
    this.track = t;
  }
}
