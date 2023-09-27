import { Component, Input } from '@angular/core';
import { ProgressTrack } from '../progress-tracker.models';
import { ProgressTrackerService } from '../progress-tracker.service';

@Component({
  selector: 'progress-group',
  templateUrl: './progress-group.component.html',
  styleUrls: ['./progress-group.component.less']
})
export class ProgressGroupComponent {
  @Input() set keys(keys: ProgressTrack['key'][]) {
    this._keys = keys;
    this.getTracks();

    if (keys.length === 1) {
      this.setTrack(this._keys[0]);
    }
  }
  get keys(): ProgressTrack['key'][] {
    return this._keys;
  }

  activeTack: ProgressTrack['key'];
  tracks: ProgressTrack[];

  private _keys: ProgressTrack['key'][];

  constructor(private progressTrackerService: ProgressTrackerService) {}

  setTrack(key: ProgressTrack['key']): void {
    this.activeTack = key;
  }

  private getTracks(): void {
    this.tracks = this.progressTrackerService.getAllTracks();
  }
}
