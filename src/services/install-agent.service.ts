import { Injectable } from '@angular/core';
import { ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/flexy.interface';
import { Observable, Subscriber, throwError } from 'rxjs';
import { DevlogService } from './devlog.service';
import { FlexyService } from './flexy.service';

@Injectable({ providedIn: 'root' })
export class InstallAgentService extends DevlogService {
  count = 0;
  total = 0;
  url: string;
  version: string;
  form: string;
  config: FlexySettings;
  observer$: Subscriber<ProgressMessage>;

  constructor(private flexyService: FlexyService) {
    super();
    this.devLogEnabled = true;
    this.devLogPrefix = 'IA.S';
  }

  private generateDeviceLogMessage(deviceName: string, deviceIndex: number, message: string): string {
    this.devLog('generateDeviceLogMessage', { deviceName, deviceIndex, message });
    return deviceIndex < 0 ? message : `[${deviceIndex + 1}/${this.total}] ${deviceName}: ${message}`;
  }

  private setLogMessage(message: Partial<ProgressMessage>): void {
    this.devLog('setLogMessage', { message });
    const defaultConfig: ProgressMessage = {
      date: new Date(),
      message: '',
      type: 'info'
    };
    this.observer$.next({ ...defaultConfig, ...message });
  }

  private sendErrorMessage(message: string, details?: string): void {
    this.devLog('sendErrorMessage', { message, details });
    this.setLogMessage({ message, details, icon: 'high-priority', type: 'error' });
  }

  private sendSimpleMessage(message: string, icon?: string): void {
    this.devLog('sendSimpleMessage', { message, icon });
    this.setLogMessage({ message, icon, type: 'info' });
  }

  private sendDeviceErrorMessage(deviceName: string, deviceIndex: number, message: string, details?: string): void {
    this.devLog('sendDeviceErrorMessage', { deviceName, deviceIndex, message, details });
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      details,
      type: 'error',
      icon: 'high-priority'
    });
  }

  private sendDeviceSimpleMessage(deviceName: string, deviceIndex: number, message: string, icon?: string): void {
    this.devLog('sendDeviceSimpleMessage', { deviceName, deviceIndex, message, icon });
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      icon
    });
  }

  private generateFlexCommandFileConfig(file: string): FlexyCommandFile {
    this.devLog('generateFlexCommandFileConfig', { file });
    const url = new URL(file);
    return {
      server: url.origin,
      files: [url.pathname]
    } as FlexyCommandFile;
  }

  private async getSerial(devceName: string, index: number, deviceName: string, config = this.config): Promise<string> {
    this.devLog('getSerial', { devceName, index, deviceName, config });
    this.sendDeviceSimpleMessage(devceName, index, 'Step 1 - Requesting Serial', 'certificate');
    try {
      return await this.flexyService.getSerial(deviceName, config);
    } catch (error) {
      console.error('Could not obtain serialnumber', error);
      this.sendDeviceErrorMessage(devceName, index, 'Could not obtain serialnumber.', error.message);
      return;
    }
  }

  private async loadFile(
    deviceName: string,
    index: number,
    step: string,
    deviceEncodedName: string,
    filename: string,
    config = this.config
  ): Promise<string> {
    this.devLog('loadFile', { deviceName, index, step, deviceEncodedName, filename, config });
    this.sendDeviceSimpleMessage(
      deviceName,
      index,
      `Step ${step} - Loading file <code>${filename}</code>`,
      'download-archive'
    );
    try {
      return await this.flexyService.installSoftware(
        this.generateFlexCommandFileConfig(filename),
        deviceEncodedName,
        config
      );
    } catch (error) {
      console.error('Could not install file', error);
      this.sendDeviceErrorMessage(deviceName, index, `Could not install file <code>${filename}</code>.`, error.message);
      return null;
    }
    // TODO check upload success
  }

  private async loadFilesOntoDevice(device: EwonFlexyStructure, index: number, config = this.config): Promise<boolean> {
    try {
      // connector
      const connector = await this.loadFile(device.name, index, '2.1', device.encodedName, config.url.connector);
      if (!connector) return;
      this.devLog('installAgent|connector', connector);

      // JVMrun
      const jvmrun = await this.loadFile(device.name, index, '2.2', device.encodedName, config.url.jvmrun);
      if (!jvmrun) return;
      this.devLog('installAgent|jvmrun', jvmrun);

      // (optional) c8y config
      if (config.url.hasOwnProperty('cumulocity') && !!config.url.cumulocity) {
        const c8yconfig = await this.loadFile(device.name, index, '2.3', device.encodedName, config.url.cumulocity);
        if (!c8yconfig) return;
        this.devLog('installAgent|c8yconfig', c8yconfig);
      }

      return true;
    } catch (error) {
      this.sendDeviceErrorMessage(device.name, index, 'Could not reboot device', error.message);
    }
  }

  private async installAgent(device: EwonFlexyStructure, index: number, config = this.config): Promise<string> {
    this.devLog('installAgent', { device, index, config });

    const isC8yDevice = device.hasOwnProperty('source') && !!device.source;
    const isT2mDevice = device.hasOwnProperty('id') && !!device.id;
    this.devLog('installAgent|connectionCheck', { isC8yDevice, isT2mDevice });

    try {
      if (isC8yDevice && !isT2mDevice) throw new Error('Not connected to Talk2M');
      // TODO fetch device status
      if (!device.status || device.status !== 'online') throw new Error('Device is not online');

      // TODO check if VPN connected - is possible @Stefan R
      // install

      // 1. request SN
      const serial = await this.getSerial(device.name, index, device.encodedName);
      if (!serial) return;
      this.devLog('installAgent|serial', serial);

      // 2. files
      const files = await this.loadFilesOntoDevice(device, index, config);
      if (!files) return;

      // 3. reboot
      this.sendDeviceSimpleMessage(device.name, index, 'Step 3 - Reboot', 'refresh');
      const reboot = await this.flexyService.reboot(device.encodedName, config);
      this.devLog('installAgent|reboot', reboot);
      
      this.flexyService.registerFlexy(device);

      return Promise.resolve('done');
    } catch (error) {
      this.sendDeviceErrorMessage(device.name, index, 'Failed to install agent', error.message);
    }
  }

  install(devices: EwonFlexyStructure[], config: FlexySettings): Observable<ProgressMessage> {
    this.devLog('install', { devices, config });

    const devicePromises = [];
    return new Observable<ProgressMessage>((observer) => {
      this.observer$ = observer;

      // input validation
      if (!devices.length) this.sendErrorMessage('No eligible devices available.');
      if (!config.deviceUsername) this.sendErrorMessage('Device username missing.');
      if (!config.devicePassword) this.sendErrorMessage('Device password missing.');
      if (!config.url) {
        this.sendErrorMessage('File URLs missing.');
      } else {
        if (!config.url.connector || config.url.connector === '') this.sendErrorMessage('Connector file URL missing.');
        if (!config.url.jvmrun || config.url.jvmrun === '') this.sendErrorMessage('JVMrun file URL missing.');
      }

      // start install
      this.sendSimpleMessage('Starting install', 'rocket');
      this.total = devices.length;
      this.config = config;

      devices.forEach((device, index) => devicePromises.push(this.installAgent(device, index)));
      Promise.all(devicePromises).then(() => this.observer$.complete());
    });
  }
}
