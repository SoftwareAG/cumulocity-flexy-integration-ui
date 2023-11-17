import { Injectable } from '@angular/core';
import { ProgressMessage } from 'flexy-integration/models/c8y-custom-objects.model';
import { Subscriber } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProgressLoggerService {
  total = 0;
  observer$: Subscriber<ProgressMessage>;

  constructor() {}

  generateDeviceLogMessage(deviceName: string, deviceIndex: number, message: string): string {
    return deviceIndex < 0 ? message : `[${deviceIndex + 1}/${this.total}] ${deviceName}: ${message}`;
  }

  setLogMessage(message: Partial<ProgressMessage>): void {
    const defaultConfig: ProgressMessage = {
      date: new Date(),
      message: '',
      type: 'info'
    };
    this.observer$.next({ ...defaultConfig, ...message });
  }

  sendErrorMessage(message: string, details?: string): void {
    this.setLogMessage({ message, details, icon: 'high-priority', type: 'error' });
  }

  sendSimpleMessage(message: string, icon?: string): void {
    this.setLogMessage({ message, icon, type: 'info' });
  }

  sendDeviceErrorMessage(deviceName: string, deviceIndex: number, message: string, details?: string): void {
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      details,
      type: 'error',
      icon: 'high-priority'
    });
  }

  sendDeviceSimpleMessage(deviceName: string, deviceIndex: number, message: string, icon?: string): void {
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      icon
    });
  }
}
