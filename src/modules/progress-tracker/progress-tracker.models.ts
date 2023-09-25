import { BehaviorSubject } from 'rxjs';

export interface ProgressTrack {
  key: string;
  name?: string;
  history: ProgressTrackItem[];
}
export interface ProgressTrackItem {
  date: Date;
  message: string;
  details?: string;
  icon?: string;
}
export interface TrackSubject {
  key: ProgressTrack['key'];
  track$: BehaviorSubject<ProgressTrack>;
}
