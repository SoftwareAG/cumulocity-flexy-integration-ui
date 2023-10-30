import { Injectable } from '@angular/core';
import { ProgressMessage } from 'flexy-integration/models/c8y-custom-objects.model';
import { Subscriber } from 'rxjs';
import { DevlogService } from './devlog.service';

@Injectable({ providedIn: 'root' })
export class ProgressLoggerService extends DevlogService {
  total = 0;
  observer$: Subscriber<ProgressMessage>;

  constructor() {
    super();
    this.devLogEnabled = false;
    this.devLogPrefix = 'PL.S';
  }

  generateDeviceLogMessage(deviceName: string, deviceIndex: number, message: string): string {
    this.devLog('generateDeviceLogMessage', { deviceName, deviceIndex, message });
    return deviceIndex < 0 ? message : `[${deviceIndex + 1}/${this.total}] ${deviceName}: ${message}`;
  }

  setLogMessage(message: Partial<ProgressMessage>): void {
    this.devLog('setLogMessage', { message });
    const defaultConfig: ProgressMessage = {
      date: new Date(),
      message: '',
      type: 'info'
    };
    this.observer$.next({ ...defaultConfig, ...message });
  }

  sendErrorMessage(message: string, details?: string): void {
    this.devLog('sendErrorMessage', { message, details });
    this.setLogMessage({ message, details, icon: 'high-priority', type: 'error' });
  }

  sendSimpleMessage(message: string, icon?: string): void {
    this.devLog('sendSimpleMessage', { message, icon });
    this.setLogMessage({ message, icon, type: 'info' });
  }

  sendDeviceErrorMessage(deviceName: string, deviceIndex: number, message: string, details?: string): void {
    this.devLog('sendDeviceErrorMessage', { deviceName, deviceIndex, message, details });
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      details,
      type: 'error',
      icon: 'high-priority'
    });
  }

  sendDeviceSimpleMessage(deviceName: string, deviceIndex: number, message: string, icon?: string): void {
    this.devLog('sendDeviceSimpleMessage', { deviceName, deviceIndex, message, icon });
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      icon
    });
  }
}
