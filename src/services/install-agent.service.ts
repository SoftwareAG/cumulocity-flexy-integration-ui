import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';
import { ProgressMessage, ProgressMessageType } from '@interfaces/c8y-custom-objects.interface';
import { Talk2MService } from './talk2m.service';
import * as _ from 'lodash';

@Injectable({ providedIn: 'root' })
export class InstallAgentService {
  count = 0;
  total = 0;
  url: string;
  version: string;
  form: string;
  config: FlexySettings;
  observer$: Subscriber<ProgressMessage>;

  constructor(private talk2mService: Talk2MService) {}

  private generateDeviceLogMessage(deviceIndex: number, message: string): string {
    return deviceIndex < 0 ? message : `Device ${deviceIndex + 1}/${this.total}: ${message}`;
  }

  private setLogMessage(message: Partial<ProgressMessage>): void {
    const defaultConfig: ProgressMessage = {
      date: new Date(),
      message: '',
      type: 'info'
    };
    this.observer$.next({ ...defaultConfig, ...message });
  }

  private sendErrorMessage(message: string, details?: string): void {
    this.setLogMessage({ message, details, icon: 'high-priority', type: 'error' });
  }

  private sendSimpleMessage(message: string, icon?: string): void {
    this.setLogMessage({ message, icon, type: 'info' });
  }

  private sendDeviceErrorMessage(deviceIndex: number, message: string, details?: string): void {
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceIndex, message),
      details,
      type: 'error',
      icon: 'high-priority'
    });
  }

  private sendDeviceSimpleMessage(deviceIndex: number, message: string, icon?: string): void {
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceIndex, message),
      icon
    });
  }

  private generateFlexCommandFileConfig(file: string): FlexyCommandFile {
    const url = new URL(file);
    return {
      server: url.origin,
      files: [url.pathname]
    } as FlexyCommandFile;
  }

  private async getSerial(index: number, deviceName: string, config = this.config): Promise<string> {
    this.sendDeviceSimpleMessage(index, 'Step 1 - Requesting Serial', 'certificate');
    try {
      return await this.talk2mService.getSerial(deviceName, config);
    } catch (error) {
      console.error('Could not obtain serialnumber', error);
      this.sendDeviceErrorMessage(index, 'Could not obtain serialnumber.', error.message);
      return null;
    }
  }

  private async loadFile(
    index: number,
    step: string,
    deviceName: string,
    filename: string,
    config = this.config
  ): Promise<string> {
    this.sendDeviceSimpleMessage(index, `Step ${step} - Loading file <code>${filename}</code>`, 'download-archive');
    try {
      return await this.talk2mService.installSoftware(this.generateFlexCommandFileConfig(filename), deviceName, config);
    } catch (error) {
      console.error('Could not install file', error);
      this.sendDeviceErrorMessage(index, `Could not install file <code>${filename}</code>.`, error.message);
      return null;
    }
    // TODO check upload success
  }

  private async installDevice(device: EwonFlexyStructure, index: number, config = this.config): Promise<void> {
    try {
      // 1. request SN
      // TODO why do we request the serial? it does not seem to be used anywhere
      const serial = await this.getSerial(index, device.encodedName);
      if (!serial) return;

      // 2. files
      const [connector, jvmrun, c8yconfig] = await Promise.all([
        this.loadFile(index, '2.1', device.encodedName, config.url.connector),
        this.loadFile(index, '2.2', device.encodedName, config.url.jvmrun),
        this.loadFile(index, '2.3', device.encodedName, config.url.cumulocity)
      ]);

      if (!connector || !jvmrun || !c8yconfig) return;

      // 3. reboot
      this.sendDeviceSimpleMessage(index, 'Step 3 - Reboot', 'refresh');
      await this.talk2mService.reboot(device.encodedName, config);
    } catch (error) {
      this.sendDeviceErrorMessage(index, 'Could not reboot device', error.message);
    }
  }

  install(devices: EwonFlexyStructure[], config: FlexySettings): Observable<ProgressMessage> {
    console.log('install', { devices, config });
    return new Observable<ProgressMessage>((observer) => {
      this.observer$ = observer;

      if (!devices.length) this.sendErrorMessage('No eligible devices available.');
      if (!config.deviceUsername) this.sendErrorMessage('Device username missing.');
      if (!config.devicePassword) this.sendErrorMessage('Device password missing.');
      if (!config.url) {
        this.sendErrorMessage('File URLs missing.');
      } else {
        if (!config.url.connector || config.url.connector === '') this.sendErrorMessage('Connector file URL missing.');
        if (!config.url.jvmrun || config.url.jvmrun === '') this.sendErrorMessage('JVMrun file URL missing.');
        if (!config.url.cumulocity || config.url.cumulocity === '')
          this.sendErrorMessage('Cumulocity config file URL missing.');
      }

      this.total = devices.length;
      this.sendSimpleMessage('Starting install', 'rocket');
      this.config = config;

      devices.forEach((device, index) => this.installDevice(device, index));
      // this.observer$.complete(); // TODO proper complete handling
    });
  }
}
