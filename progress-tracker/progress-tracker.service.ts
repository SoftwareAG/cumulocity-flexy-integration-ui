import { Injectable } from '@angular/core';
import { has } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { ProgressTrack, ProgressTrackItem, TrackSubject } from './progress-tracker.models';

@Injectable({ providedIn: 'root' })
export class ProgressTrackerService {
  protected tracks: TrackSubject[] = [];

  addTrack(key: ProgressTrack['key'], name?: ProgressTrack['name']): TrackSubject['track$'] {
    if (this.hasTrack(key)) {
      return this.getTrackSubject(key);
    }

    const track: ProgressTrack = {
      key,
      name,
      history: []
    };
    const subject: TrackSubject = {
      key,
      track$: new BehaviorSubject(track)
    };

    this.tracks.push(subject);

    return subject.track$;
  }

  hasTrack(key: ProgressTrack['key']): boolean {
    return !!this.getTrack(key);
  }

  getTrackSubject(key: ProgressTrack['key']): TrackSubject['track$'] {
    return this.tracks.find((t) => t.key === key).track$;
  }

  addItem(key: ProgressTrack['key'], item: Partial<ProgressTrackItem>) {
    let track$: BehaviorSubject<ProgressTrack>;

    try {
      track$ = this.getTrackSubject(key);
    } catch (error) {
      throw new Error('Track does not exist');
    }

    if (!track$) {
      return;
    }

    const current = track$.value;

    if (!has(item, 'date')) {
      item.date = new Date();
    }

    current.history.push(item as ProgressTrackItem);
    track$.next(current);
  }

  addMessage(key: ProgressTrack['key'], message: ProgressTrackItem['message']) {
    return this.addItem(key, { message });
  }

  getAllTracks(): ProgressTrack[] {
    return this.tracks.map((pt) => pt.track$.getValue());
  }

  removeTrack(key: ProgressTrack['key']): ProgressTrack {
    if (!this.hasTrack(key)) {
      throw new Error('Track does not exist');
    }

    let track: ProgressTrack;
    this.tracks.forEach((t, index) => {
      if (t.key === key) {
        track = this.tracks.splice(index, 1)[0].track$.value;
      }
    });

    return track;
  }

  private getTrack(key: ProgressTrack['key']): TrackSubject {
    return this.tracks.find((t) => t.key === key);
  }
}
