import { Injectable } from '@angular/core';
import { ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/flexy.interface';
import { Observable, Subscriber } from 'rxjs';
import { DevlogService } from './devlog.service';
import { FlexyService } from './flexy.service';
import * as _ from 'lodash';

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

  // helper
  private sleep(ms): Promise<NodeJS.Timer>{
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFilenameFromUrl(url: string): string {
    return url.split('/').pop();
  }

  // ui response
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

  // step handling
  private async getSerial(deviceName: string, index: number, encodedName: string, config = this.config): Promise<string> {
    this.devLog('getSerial', { deviceName, index, encodedName, config });
    try {
      return await this.flexyService.getSerial(encodedName, config);
    } catch (error) {
      console.error('Could not obtain serialnumber', error);
      this.sendDeviceErrorMessage(deviceName, index, 'Could not obtain serialnumber.', error.message);
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
      `<b>Step ${step}</b> - Loading file <code>${filename}</code>`,
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
    this.devLog('loadFilesOntoDevice', { device, index, config });

    try {
      // connector
      const connector = await this.loadFile(device.name, index, '4.1', device.encodedName, config.url.connector);
      if (!connector) return;
      this.devLog('installAgent|connector', connector);

      // JVMrun
      const jvmrun = await this.loadFile(device.name, index, '4.2', device.encodedName, config.url.jvmrun);
      if (!jvmrun) return;
      this.devLog('installAgent|jvmrun', jvmrun);

      // (optional) c8y config
      if (config.url.hasOwnProperty('cumulocity') && !!config.url.cumulocity) {
        const c8yconfig = await this.loadFile(device.name, index, '4.3', device.encodedName, config.url.cumulocity);
        if (!c8yconfig) return;
        this.devLog('installAgent|c8yconfig', c8yconfig);
      }

      return true;
    } catch (error) {
      this.sendDeviceErrorMessage(device.name, index, 'Could not reboot device', error.message);
    }
  }

  private async pollForFile(
    device: EwonFlexyStructure,
    index: number,
    config = this.config,
    file: string,
    attempts = 5,
    timeout = 60000
  ): Promise<boolean> {
    this.devLog('pollForFile', { device, index, config, file });
    const filename = this.getFilenameFromUrl(file);
    let fileExists = false;

    // interval polling
    for (let i = 1; i <= attempts; i++) {
      try {
        this.devLog('pollForLoadedFiles|attempt ' + i, { filename, device });
        this.sendDeviceSimpleMessage(
          device.name, index,
          `Polling for file <span class="text-warning">"${filename}"</span>.<br><b>Attempt ${i} of ${attempts}</b>`, 'file-view'
        );
        fileExists = await this.flexyService.downloadSoftware(filename, device.name, config);
        this.devLog('pollForLoadedFiles|file ' + i, { file, fileExists });
      }
      catch (error) {
        // TODO check handling of error cases: file not found, bad gateway
        this.devLog('pollForLoadedFiles|error', { attempt: i, device, filename, error });
      }

      if (fileExists) {
        // file found
        this.sendDeviceSimpleMessage(device.name, index, `File <span class="text-success">"${filename}" found</span>.`, 'check-document');
        return true;
      } else {
        // next attempt or failure
        // TODO exit on bad gateway?
        if (i === attempts) {
          this.sendDeviceSimpleMessage(device.name, index, `File <span class="text-error">"${filename}" not found</span>.`, 'delete-file');
          return false;
        } else {
          this.sleep(timeout);
        }
      }
    }
  }

  private checkForLoadedFiles(device: EwonFlexyStructure, index: number, config = this.config, attempts = 5): Promise<boolean> {
    this.devLog('checkForLoadedFiles', { device, index, config });

    const files = [
      this.pollForFile(device, index, config, config.url.connector, attempts),
      this.pollForFile(device, index, config, config.url.jvmrun, attempts)
    ];

    if (config.url.hasOwnProperty('cumulocity') && !!config.url.cumulocity) {
      files.push(this.pollForFile(device, index, config, config.url.cumulocity, attempts));
    }

    return Promise.all(files).then((res) => res.reduce((p, c) => p && c, true));
  }

  private async installAgent(device: EwonFlexyStructure, index: number, config = this.config): Promise<string> {
    this.devLog('installAgent', { device, index, config });

    const isC8yDevice = device.hasOwnProperty('source') && !!device.source;
    const isT2mDevice = device.hasOwnProperty('id') && !!device.id;
    this.devLog('installAgent|connectionCheck', { isC8yDevice, isT2mDevice });

    try {
      // TODO remove check for c8y device
      if (isC8yDevice && !isT2mDevice) throw new Error('Not connected to Talk2M');
      // if (!device.status || device.status !== 'online') throw new Error('Device is not online');

      // 1. request SN
      this.sendDeviceSimpleMessage(device.name, index, 'Step 1 - Requesting Serial', 'certificate');
      const serial = await this.getSerial(device.name, index, device.encodedName);
      this.devLog('installAgent|serial', [index + 1, serial]);
      // if (!serial) return;

      // 2. check if device was already connected via agent
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 2</b> - Check if device was already connected via agent', 'plug');

      // 3. check if files are already present on device
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 3</b> - Check for preexisting files', 'search');
      const filesExistAlready = await this.checkForLoadedFiles(device, index, config, 1);
      if (filesExistAlready) {
        this.sendDeviceErrorMessage(device.name, index, `File(s) already exist on device.`);
        return;
      }

      // 4. files
      this.sendDeviceSimpleMessage(device.name, index, `<b>Step 4</b> - Download files`, 'download-archive');
      const files = await this.loadFilesOntoDevice(device, index, config);
      this.devLog('installAgent|loadFilesOntoDevice', [index + 1, files]);
      // if (!files) return;

      // 5. check files
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 5</b> - Download files to device', 'cloud-download');
      const filesLoaded = await this.checkForLoadedFiles(device, index, config);
      this.devLog('installAgent|checkForLoadedFiles', [index + 1, filesLoaded]);
      if (!filesLoaded) return;

      // 6. reboot
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 6</b> - Reboot', 'refresh');
      const reboot = await this.flexyService.reboot(device.encodedName, config);
      this.devLog('installAgent|reboot', [index + 1, reboot]);
      // this.devLog('installAgent|reboot', reboot);

      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 6</b> - waiting for Reboot', 'clock1');
      // TODO wait for reboot to finish (poll for serial)

      // 7. register device
      if (!isC8yDevice) {
        this.sendDeviceSimpleMessage(device.name, index, 'Step 7</b> - Register device', 'cloud-checked');
        this.flexyService.registerFlexy(device); // TODO get device group
      }

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
