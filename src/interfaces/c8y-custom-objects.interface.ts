import { IManagedObject } from '@c8y/client';
import { EwonFlexyStructure, FlexySettings } from './flexy.interface';

export interface IOnloadingJobObject extends IManagedObject {
  c8y_HMSOnloadingJob: {};
  ewonIds: [];
  name: string;
  description: string;
  isActive: boolean;
}

export interface InstallAgentForm {
  config: FlexySettings;
  devices: EwonFlexyStructure[];
}

export type ProgressMessageType = 'error' | 'warning' | 'info';

export interface ProgressMessage {
  date: Date;
  type: ProgressMessageType;
  message: string;
  details?: string;
  icon?: string;
}
