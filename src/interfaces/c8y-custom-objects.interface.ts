import { IManagedObject } from '@c8y/client';
import { EwonFlexyStructure, FlexySettings } from './ewon-flexy-registration.interface';

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

export interface ProgressMessage {
  date: Date;
  message: string;
  details?: string;
  icon?: string;
}
