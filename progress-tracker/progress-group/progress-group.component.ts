import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProgressTrack } from '../progress-tracker.models';
import { ProgressTrackerService } from '../progress-tracker.service';

@Component({
  selector: 'progress-group',
  templateUrl: './progress-group.component.html',
  styleUrls: ['./progress-group.component.less']
})
export class ProgressGroupComponent {
  @Input() alwaysShowTabs = false;
  @Input() set keys(keys: ProgressTrack['key'][]) {
    this._keys = keys;
    this.tracks = this.getTracks();

    if (!this.activeTack && keys.length === 1) {
      this.setTrack(this._keys[0]);
    }
  }
  get keys(): ProgressTrack['key'][] {
    return this._keys;
  }

  @Input() set tab(tab: ProgressTrack['key']) {
    this.setTrack(tab);
  }
  get tab(): ProgressTrack['key'] {
    return this.activeTack;
  }

  @Output() tabChange = new EventEmitter<ProgressTrack['key']>();

  activeTack: ProgressTrack['key'];
  tracks: ProgressTrack[];

  private _keys: ProgressTrack['key'][];

  constructor(private progressTrackerService: ProgressTrackerService) {}

  setTrack(key: ProgressTrack['key']): void {
    if (!key || this.activeTack === key || !this.keys.includes(key)) {
      return;
    }

    this.activeTack = key;
    this.tabChange.emit(this.activeTack);
  }

  private getTracks(): ProgressTrack[] {
    return this.progressTrackerService.getAllTracks();
  }
}
