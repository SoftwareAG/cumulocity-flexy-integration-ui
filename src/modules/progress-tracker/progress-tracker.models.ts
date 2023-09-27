import { BehaviorSubject } from 'rxjs';

export interface ProgressTrack {
  key: string;
  name?: string;
  history: ProgressTrackItem[];
}
export interface Badge {
  text: string;
  status: 'default' | 'primary' | 'danger' | 'warning' | 'success' | 'info';
}
export interface ProgressTrackItem {
  date: Date;
  message: string;
  details?: string;
  icon?: string;
  iconClass?: string;
  badge?: Badge;
}
export interface TrackSubject {
  key: ProgressTrack['key'];
  track$: BehaviorSubject<ProgressTrack>;
}
