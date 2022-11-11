import { Injectable } from '@angular/core';
import { IExternalIdentity } from '@c8y/client';
import { FLEXY_EXTERNALID_FLEXY_PREFIX } from '@constants/flexy-integration.constants';
import { ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/flexy.interface';
import { Observable, Subscriber } from 'rxjs';
import { DevlogService } from './devlog.service';
import { ExternalIDService } from './external-id.service';
import { FlexyService } from './flexy.service';
import { ProgressLoggerService } from './progress-logger.service';
import { Talk2MService } from './talk2m.service';

@Injectable({ providedIn: 'root' })
export class InstallAgentService extends DevlogService {
  private messageLogging = false;
  private filePollAttempts = 5;
  private filePollInterval = 10; // in sec
  private rebootAttempts = 10;
  private rebootInterval = 30; // in sec
  count = 0;
  total = 0;
  url: string;
  version: string;
  form: string;
  config: FlexySettings;
  observer$: Subscriber<ProgressMessage>;

  constructor(
    private flexyService: FlexyService,
    private talk2mService: Talk2MService,
    private externalIDService: ExternalIDService,
    private progressLogger: ProgressLoggerService
  ) {
    super();
    this.devLogEnabled = true;
    this.devLogPrefix = 'IA.S';
    this.observer$ = this.progressLogger.observer$;
  }

  // helper
  private sleep(seconds): Promise<NodeJS.Timer> {
    // TODO display timeout between requests to user (progress-bar?)
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private getFilenameFromUrl(url: string): string {
    return url.split('/').pop();
  }

  // ui response
  private generateDeviceLogMessage(deviceName: string, deviceIndex: number, message: string): string {
    if (this.messageLogging) this.devLog('generateDeviceLogMessage', { deviceName, deviceIndex, message });
    return deviceIndex < 0 ? message : `[${deviceIndex + 1}/${this.total}] ${deviceName}: ${message}`;
  }

  private setLogMessage(message: Partial<ProgressMessage>): void {
    if (this.messageLogging) this.devLog('setLogMessage', { message });
    const defaultConfig: ProgressMessage = {
      date: new Date(),
      message: '',
      type: 'info'
    };
    this.observer$.next({ ...defaultConfig, ...message });
  }

  private sendErrorMessage(message: string, details?: string): void {
    if (this.messageLogging) this.devLog('sendErrorMessage', { message, details });
    this.setLogMessage({ message, details, icon: 'high-priority', type: 'error' });
  }

  private sendSimpleMessage(message: string, icon?: string): void {
    if (this.messageLogging) this.devLog('sendSimpleMessage', { message, icon });
    this.setLogMessage({ message, icon, type: 'info' });
  }

  private sendDeviceErrorMessage(deviceName: string, deviceIndex: number, message: string, details?: string): void {
    if (this.messageLogging) this.devLog('sendDeviceErrorMessage', { deviceName, deviceIndex, message, details });
    this.setLogMessage({
      message: this.generateDeviceLogMessage(deviceName, deviceIndex, message),
      details,
      type: 'error',
      icon: 'high-priority'
    });
  }

  private sendDeviceSimpleMessage(deviceName: string, deviceIndex: number, message: string, icon?: string): void {
    if (this.messageLogging) this.devLog('sendDeviceSimpleMessage', { deviceName, deviceIndex, message, icon });
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
  private async getSerial(
    deviceName: string,
    index: number,
    encodedName: string,
    config = this.config
  ): Promise<string> {
    this.devLog('getSerial', { deviceName, index, encodedName, config });
    try {
      return await this.flexyService.getSerial(encodedName, config);
    } catch (error) {
      console.error('Could not obtain serialnumber', error);
      this.sendDeviceErrorMessage(deviceName, index, 'Could not obtain serialnumber.', error.message);
      return;
    }
  }

  private async checkIfDeviceIsOnline(
    deviceName: string,
    index: number,
    encodedName: string,
    config = this.config,
    attempts = this.rebootAttempts,
    timeout = this.rebootInterval
  ): Promise<boolean> {
    this.devLog('checkIfDeviceIsOnline', { deviceName, index, encodedName, config });
    let serial: string;

    for (let i = 1; i < attempts; i += 1) {
      this.sendDeviceSimpleMessage(
        deviceName,
        index,
        `Waiting for device to reboot.<br><b>Attempt ${i} of ${attempts}</b>`,
        'clock1'
      );

      try {
        serial = await this.getSerial(deviceName, index, encodedName, config);
      } catch (error) {
        this.devLog('checkIfDeviceIsOnline|error', { attempt: i, deviceName, error });
      }

      if (serial) {
        this.sendDeviceSimpleMessage(
          deviceName,
          index,
          `Device <span class="text-success">is online</span>.`,
          'connected'
        );
        return true;
      } else {
        await this.sleep(timeout);
      }
    }

    return false;
  }

  private async updateDeviceMO(
    device: EwonFlexyStructure,
    flexy: IExternalIdentity,
    talk2m: IExternalIdentity
  ): Promise<boolean> {
    this.devLog('updateDeviceMO', { device, flexy, talk2m });

    if (flexy) {
      /*
      If there already is a device MO with the external ID "HMS-Flexy-{SERIAL}" that also has the agent fragment:
        - add "HMS-Talk2M-{EwonID} if not present
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(flexy);
      if (deviceMO.hasOwnPropery('com_cumulocity_agent') && !talk2m) {
        // TODO test & exception handling
        void (await this.talk2mService.createExternalIDForDevice(deviceMO, flexy.externalId));
        return Promise.reject('Device MO has external Flexy ID.');
      }
    } else if (talk2m) {
      /*
        If there already is a device MO with the external ID "HMS-Talk2M-{EwonID} and a different "HMS-Felxy-{SERIAL}":
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(talk2m);
      const externalIDs = await await this.externalIDService.getExternalIDsForDevice(deviceMO);
      const flexyIDs = externalIDs.filter((id) => id.externalId.indexOf(FLEXY_EXTERNALID_FLEXY_PREFIX) >= 0);
      // TODO test
      if (flexyIDs.length) return Promise.reject('Device MO already has an external Flexy ID.');
      else this.devLog('updateDeviceMO|Device has external talk2m ID, but no flexy ID', { externalIDs });
    }

    return Promise.resolve(true);
  }

  private async checkIfDeviceConectedViaAgent(
    device: EwonFlexyStructure,
    index: number,
    config = this.config
  ): Promise<boolean> {
    this.devLog('checkIfDeviceConectedViaAgent', { device, index, config });

    let flexy: IExternalIdentity;
    try {
      flexy = await this.flexyService.getExternalID(device.id);
    } catch (error) {
      this.devLog('checkIfDeviceConectedViaAgent|flexy', { error });
      flexy = null;
    }

    let talk2m: IExternalIdentity;
    try {
      talk2m = await this.talk2mService.getExternalID(device.id);
    } catch (error) {
      this.devLog('checkIfDeviceConectedViaAgent|talk2m', { error });
      talk2m = null;
    }

    return this.updateDeviceMO(device, flexy, talk2m);
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
    attempts = this.filePollAttempts,
    timeout = this.filePollInterval
  ): Promise<boolean> {
    this.devLog('pollForFile', { device, index, config, file });
    const filename = this.getFilenameFromUrl(file);
    let fileExists = false;

    // interval polling
    for (let i = 1; i <= attempts; i++) {
      try {
        this.devLog('pollForLoadedFiles|attempt ' + i, { filename, device });
        this.sendDeviceSimpleMessage(
          device.name,
          index,
          `Polling for file <span class="text-warning">"${filename}"</span>.<br><b>Attempt ${i} of ${attempts}</b>`,
          'file-view'
        );
        fileExists = await this.flexyService.downloadSoftware(filename, device.name, config);
        this.devLog('pollForLoadedFiles|file ' + i, { file, fileExists });
      } catch (error) {
        this.devLog('pollForLoadedFiles|error', { attempt: i, device, filename, error });
        // abort on bad gateway (should be covered by device online check – no feedback)
        if (error.status === 502) return false;
      }

      if (fileExists) {
        // file found
        this.sendDeviceSimpleMessage(
          device.name,
          index,
          `File <span class="text-success">"${filename}" found</span>.`,
          'check-document'
        );
        return true;
      } else {
        // next attempt or failure
        if (i === attempts) {
          this.sendDeviceSimpleMessage(
            device.name,
            index,
            `File <span class="text-error">"${filename}" not found</span>.`,
            'delete-file'
          );
          return false;
        } else {
          await this.sleep(timeout);
        }
      }
    }
  }

  private checkForLoadedFiles(
    device: EwonFlexyStructure,
    index: number,
    config = this.config,
    attempts = 5
  ): Promise<boolean> {
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

  private async hasAgentFragment(device, index): Promise<boolean> {
    this.devLog('hasAgentFragment', { device });

    try {
      const mo = await this.talk2mService.getExternalID(device.id);

      return Promise.resolve(true);
    } catch (error) {
      this.sendDeviceErrorMessage(device.name, index, 'Could not update status.', error);
    }
  }

  private async installAgent(device: EwonFlexyStructure, index: number, config = this.config): Promise<string> {
    console.clear(); // TODO remove after dev
    this.devLog('installAgent', { device, index, config });

    const isC8yDevice = device.hasOwnProperty('source') && !!device.source;
    const isT2mDevice = device.hasOwnProperty('id') && !!device.id;
    this.devLog('installAgent|connectionCheck', { isC8yDevice, isT2mDevice });

    try {
      /*
      // TODO remove check for c8y device
      if (isC8yDevice && !isT2mDevice) throw new Error('Not connected to Talk2M.');
      if (!device.status || device.status !== 'online') throw new Error('Device is not online.');

      // 1. request SN
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 1</b> - Requesting Serial', 'certificate');
      const serial = await this.getSerial(device.name, index, device.encodedName);
      this.devLog('installAgent|serial', [index + 1, serial]);
      if (!serial) return;
*/
      // 2. check if device was already connected via agent
      this.sendDeviceSimpleMessage(
        device.name,
        index,
        '<b>Step 2</b> - Check if device was already connected via agent.',
        'plug'
      );
      const connectedViaAgent = await this.checkIfDeviceConectedViaAgent(device, index, config);
      console.log(connectedViaAgent);
      /*
      if (connectedViaAgent) {
        this.sendDeviceErrorMessage(device.name, index, 'Device already connected via Agent.');
        return;
      } else {
        this.sendDeviceSimpleMessage(
          device.name,
          index,
          'Device has <span class="text-success">not been connected</span> via agent.',
          'check'
        );
      }

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
      if (!files) return;

      // 5. check files
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 5</b> - Download files to device', 'cloud-download');
      const filesLoaded = await this.checkForLoadedFiles(device, index, config);
      this.devLog('installAgent|checkForLoadedFiles', [index + 1, filesLoaded]);
      if (!filesLoaded) {
        this.sendDeviceErrorMessage(
          device.name,
          index,
          'Could not verify that all files were downloaded onto the device.'
        );
        return;
      }

      // 6. reboot
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 6</b> - Reboot', 'refresh');
      const reboot = await this.flexyService.reboot(device.encodedName, config);
      this.devLog('installAgent|reboot', [index + 1, reboot]);

      // wait for reboot to finish (poll for serial)
      const isOnline = await this.checkIfDeviceIsOnline(device.name, index, device.encodedName);
      if (!isOnline) {
        this.sendDeviceErrorMessage(device.name, index, `Device not online.`);
        return;
      }
      */

      // TODO (check) flag agent installed if has agent fragment
      this.sendDeviceSimpleMessage(device.name, index, '<b>Step 7</b> - Update status', 'pencil');
      const hasAgentFragment = await this.hasAgentFragment(device, index);
      if (!hasAgentFragment) return;

      if (!isC8yDevice) {
        // 8. register device
        this.sendDeviceSimpleMessage(device.name, index, '<b>Step 8</b> - Register device', 'cloud-checked');
        // void this.flexyService.registerFlexy(device); // TODO get device group
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
