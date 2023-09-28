import { Component } from '@angular/core';
import { ProgressTrackerService } from '../progress-tracker.service';
import { ProgressTrack, ProgressTrackItem } from '../progress-tracker.models';

@Component({
  selector: 'progress-display',
  templateUrl: './progress-display.component.html',
})
export class ProgressDisplayComponent {
  progressName: ProgressTrack['name'] = 'Track 1';
  progressTracks: Partial<ProgressTrack>[] = [];
  selectedProgressKey: ProgressTrack['key'] = '';
  progressKeys: ProgressTrack['key'][] = [];

  constructor(private progressTrackerService: ProgressTrackerService) { }

  addProgress(name: ProgressTrack['name']) {
    const track: Partial<ProgressTrack> = {
      name,
      key: name.toLocaleLowerCase().replace(/(\W+\b)/g, '')
    }

    if (!this.progressTracks.find((t) => t.key === track.key)) {
      this.progressTracks.push(track);
      this.progressTrackerService.addTrack(track.key, track.name);
      this.setProgressKeys()
    }

    if (this.progressTracks.length === 1) {
      this.selectedProgressKey = track.key;
    }
  }

  message(text: ProgressTrackItem['message'] = 'Commodo Porta', key: ProgressTrack['key'] = this.selectedProgressKey) {
    this.progressTrackerService.addMessage(key, text);
  }

  async startProcess(key = this.selectedProgressKey): Promise<void> {
    try {
      await this.addRandom(5);

      this.message('sleep… zZz…', key);
      await this.sleep(2);
      await this.rejectPromise();
      await this.throwError();
      this.message('sleep… zZz…', key);
      await this.sleep(1);
    } catch (error) {
      this.progressTrackerService.addItem(key, {
        message: 'Could not complete process.',
        details: String(error),
        icon: 'warning',
        iconClass: 'text-danger',
        badge: {
          status: 'danger',
          text: 'Error'
        }
      });
    }
  }

  async addRandom(count = 10, delay = 1, prefix = 'ABC-', key = this.selectedProgressKey) {
    for (let i = 1; i <= count; i++) {
      this.progressTrackerService.addItem(key, {
        message: `${prefix}${i}/${count}`,
        icon: 'clock1',
      });

      await this.sleep(delay);
    }
  }

  async removeTrack(key = this.selectedProgressKey): Promise<void> {
    await this.progressTrackerService.removeTrack(key);

    this.progressTracks.forEach((t, index) => {
      if (t.key === key) {
        this.progressTracks.splice(index, 1);
      }
    });
    this.setProgressKeys();

    if (this.progressTracks.length === 1) {
      this.selectedProgressKey = this.progressTracks[0].key;
    }
  }

  private setProgressKeys(tracks = this.progressTracks) {
    this.progressKeys = tracks.map((p) => p.key);
  }

  private sleep(seconds = 1): Promise<NodeJS.Timer> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private async throwError(text = 'This is an Error', sleep = 1): Promise<void> {
    await this.sleep(sleep);

    throw new Error(text);
  }

  private async rejectPromise(text = 'This is a rejcted Promise', sleep = 1): Promise<void> {
    await this.sleep(sleep);

    return Promise.reject(text);
  }
}
