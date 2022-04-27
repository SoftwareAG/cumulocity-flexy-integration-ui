import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/ewon-flexy-registration.interface';
import { ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
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

  private setLogMessage(
    index: number,
    message?: string,
    icon?: string,
    details?: string,
    observer$ = this.observer$
  ): void {
    observer$.next({
      date: new Date(),
      message: index < 0 ? message : `Device ${index + 1}/${this.total}: ${message}`,
      icon,
      details
    } as ProgressMessage);
  }

  private setLogError(index = -1, message: string, details?: string, observer$ = this.observer$): void {
    // observer$.error({ // stopps the complete log
    observer$.next({
      date: new Date(),
      icon: 'high-priority',
      message: index < 0 ? message : `Device ${index + 1}/${this.total}: ${message}`,
      details
    } as ProgressMessage);
  }

  private async processGetSerial(index: number, deviceName: string, config = this.config): Promise<string> {
    this.setLogMessage(index, 'Step 1 - Requesting Serial', 'certificate');
    try {
      return await this.talk2mService.getSerial(deviceName, config);
    } catch (error) {
      console.error('Could not obtain serialnumber', error);
      this.setLogError(index, 'Could not obtain serialnumber.', error.message);
      return null;
    }
  }

  private async processGetFile(
    index: number,
    step: string,
    deviceName: string,
    filename: string,
    config = this.config
  ): Promise<string> {
    this.setLogMessage(index, `Step ${step} - Loading file <code>${filename}</code>`, 'download-archive');
    try {
      return await this.talk2mService.installSoftware(this.generateFlexCommandFileConfig(filename), deviceName, config);
    } catch (error) {
      console.error('Could not install file', error);
      this.setLogError(index, `Could not install file <code>${filename}</code>.`, error.message);
      return null;
    }
    // TODO check upload success
  }

  private async installDevice(device: EwonFlexyStructure, index: number, config = this.config): Promise<void> {
    console.group(`Device ${index}`);
    console.log('installDevice', { device, index, config });
    try {
      // 1. request SN
      // TODO why do we request the serial? it does not seem to be used anywhere
      const serial = await this.processGetSerial(index, device.encodedName);
      if (!serial) return;

      // 2. files
      const [connector, jvmrun, c8yconfig] = await Promise.all([
        this.processGetFile(index, '2.1', device.encodedName, config.url.connector),
        this.processGetFile(index, '2.2', device.encodedName, config.url.jvmrun),
        this.processGetFile(index, '2.3', device.encodedName, config.url.cumulocity)
      ]);

      if (!connector || !jvmrun || !c8yconfig) return;

      // 3. reboot
      this.setLogMessage(index, 'Step 3 - Reboot', 'refresh');
      await this.talk2mService.reboot(config.deviceName, config);
    } catch (error) {
      console.log();
      this.setLogError(index, 'Could not reboot device', error.message);
    }
    console.groupEnd();
  }

  private generateFlexCommandFileConfig(file: string): FlexyCommandFile {
    const url = new URL(file);
    const commandFile: FlexyCommandFile = {
      server: url.origin,
      files: [url.pathname]
    };
    console.log('generateFlexCommandFileConfig', url, commandFile);
    return commandFile;
  }

  install(devices: EwonFlexyStructure[], config: FlexySettings): Observable<ProgressMessage> {
    console.log('install', { devices, config });

    return new Observable<ProgressMessage>((observer) => {
      this.observer$ = observer;

      if (!devices.length) this.setLogError(-1, 'No eligible devices available.');
      if (!config.deviceUsername) this.setLogError(-1, 'Device username missing.');
      if (!config.devicePassword) this.setLogError(-1, 'Device password missing.');
      if (!config.url) {
        this.setLogError(-1, 'File URLs missing.');
      } else {
        if (!config.url.connector || config.url.connector === '') this.setLogError(-1, 'Connector file URL missing.');
        if (!config.url.jvmrun || config.url.jvmrun === '') this.setLogError(-1, 'JVMrun file URL missing.');
        if (!config.url.cumulocity || config.url.cumulocity === '')
          this.setLogError(-1, 'Cumulocity config file URL missing.');
      }

      this.total = devices.length;
      this.setLogMessage(-1, 'Starting install', 'rocket');
      this.config = config;

      devices.forEach((device, index) => this.installDevice(device, index));
      // this.observer$.complete(); // TODO proper complete handling
    });
  }
}
