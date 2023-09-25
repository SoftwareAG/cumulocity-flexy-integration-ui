import { Injectable } from '@angular/core';
import { has } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { ProgressTrack, ProgressTrackItem, TrackSubject } from './progress-tracker.models';

@Injectable({ providedIn: 'root' })
export class ProgressTrackerService {
  protected tracks: TrackSubject[] = [];

  addTrack(key: ProgressTrack['key']): TrackSubject['track$'] {
    if (this.hasTrack(key)) {
      throw new Error('Track already exists');
    }

    const track: ProgressTrack = {
      key,
      history: [],
    };
    const subject: TrackSubject = {
      key,
      track$: new BehaviorSubject(track),
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
    const track$ = this.getTrackSubject(key);

    if (!track$) {
      throw new Error('Track does not exist');
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

  private getTrack(key: ProgressTrack['key']): TrackSubject {
    return this.tracks.find((t) => t.key === key);
  }
}
