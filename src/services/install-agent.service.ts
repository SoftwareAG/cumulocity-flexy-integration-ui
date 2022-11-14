import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject } from '@c8y/client';
import { DEVICE_AGENT_FRAGMENT, FLEXY_EXTERNALID_FLEXY_PREFIX } from '@constants/flexy-integration.constants';
import { ProgressMessage } from '@interfaces/c8y-custom-objects.interface';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@interfaces/flexy.interface';
import { Observable } from 'rxjs';
import { DevlogService } from './devlog.service';
import { ExternalIDService } from './external-id.service';
import { FlexyService } from './flexy.service';
import { ProgressLoggerService } from './progress-logger.service';
import { Talk2MService } from './talk2m.service';

@Injectable({ providedIn: 'root' })
export class InstallAgentService extends DevlogService {
  private filePollAttempts = 10;
  private filePollInterval = 10; // in sec
  private rebootAttempts = 10;
  private rebootInterval = 30; // in sec
  count = 0;
  url: string;
  version: string;
  form: string;
  config: FlexySettings;

  constructor(
    private flexyService: FlexyService,
    private talk2mService: Talk2MService,
    private externalIDService: ExternalIDService,
    private progressLogger: ProgressLoggerService
  ) {
    super();
    this.devLogEnabled = true;
    this.devLogPrefix = 'IA.S';
  }

  // helper
  private sleep(seconds): Promise<NodeJS.Timer> {
    // TODO display timeout between requests to user (progress-bar?)
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private getFilenameFromUrl(url: string): string {
    return url.split('/').pop();
  }

  private generateFlexCommandFileConfig(file: string): FlexyCommandFile {
    this.devLog('generateFlexCommandFileConfig', { file });
    const url = new URL(file);
    return {
      server: url.origin,
      files: [url.pathname]
    } as FlexyCommandFile;
  }

  private deviceHasAgentFragment(deviceMO: IManagedObject): boolean {
    this.devLog('deviceHasAgentFragment', { deviceMO });
    return !!deviceMO[DEVICE_AGENT_FRAGMENT];
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
      this.progressLogger.sendDeviceErrorMessage(deviceName, index, 'Could not obtain serialnumber.', error.message);
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
      this.progressLogger.sendDeviceSimpleMessage(
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
        this.progressLogger.sendDeviceSimpleMessage(
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

  private async getExternalIDs(device: EwonFlexyStructure): Promise<IExternalIdentity[]> {
    this.devLog('getExternalIDs', { device });
    let flexy: IExternalIdentity;
    try {
      flexy = await this.flexyService.getExternalID(device.serial);
    } catch (error) {
      this.devLog('getExternalIDs|flexy', { error });
      flexy = null;
    }

    let talk2m: IExternalIdentity;
    try {
      talk2m = await this.talk2mService.getExternalID(device.serial);
    } catch (error) {
      this.devLog('getExternalIDs|talk2m', { error });
      talk2m = null;
    }

    return [flexy, talk2m];
  }

  private async checkIfDeviceConectedViaAgent(
    device: EwonFlexyStructure,
    index: number,
    config = this.config
  ): Promise<boolean> {
    this.devLog('checkIfDeviceConectedViaAgent', { device, index, config });

    const [flexy, talk2m] = await this.getExternalIDs(device);

    if (flexy) {
      /*
      If there already is a device MO with the external ID "HMS-Flexy-{SERIAL}" that also has the agent fragment:
        - add "HMS-Talk2M-{EwonID} if not present
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(flexy);
      if (deviceMO && this.deviceHasAgentFragment(deviceMO)) {
        // TODO test & exception handling
        if (!talk2m) void (await this.talk2mService.createExternalIDForDevice(deviceMO, flexy.externalId));
        return Promise.reject({ message: 'Device MO already has an external Flexy ID.' });
      }
    } else if (talk2m) {
      /*
        If there already is a device MO with the external ID "HMS-Talk2M-{EwonID} and a different "HMS-Felxy-{SERIAL}":
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(talk2m);
      const externalIDs = await await this.externalIDService.getExternalIDsForDevice(deviceMO);
      const flexyIDs = externalIDs.filter((id) => id.externalId.indexOf(FLEXY_EXTERNALID_FLEXY_PREFIX) >= 0);

      if (flexyIDs.length) return Promise.reject('Device MO already has an external Talk2M ID.');
      else this.devLog('updateDeviceMO|Device has external talk2m ID, but no other flexy ID', { externalIDs });
    }

    return Promise.resolve(false);
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
    this.progressLogger.sendDeviceSimpleMessage(
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
      this.progressLogger.sendDeviceErrorMessage(
        deviceName,
        index,
        `Could not install file <code>${filename}</code>.`,
        error.message
      );
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
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Could not reboot device', error.message);
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
        this.progressLogger.sendDeviceSimpleMessage(
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
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          `File <span class="text-success">"${filename}" found</span>.`,
          'check-document'
        );
        return true;
      } else {
        // next attempt or failure
        if (i === attempts) {
          this.progressLogger.sendDeviceSimpleMessage(
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

  private async hasAgentFragment(device: EwonFlexyStructure): Promise<boolean> {
    this.devLog('hasAgentFragment', { device });

    const ids = (await this.getExternalIDs(device)).filter((id) => !!id);
    this.devLog('hasAgentFragment|external ids', ids);
    if (!ids.length) return Promise.reject({ message: 'No external IDs found for device.' });

    const mo = await this.externalIDService.getDeviceByExternalID(ids[0].externalId);
    this.devLog('hasAgentFragment|device mo', mo);
    if (!mo) return Promise.reject({ message: 'No device MO found for Device.' });

    return this.deviceHasAgentFragment(mo)
      ? true
      : Promise.reject({ message: `Device is missing "${DEVICE_AGENT_FRAGMENT}" fragment` });
  }

  private async installAgent(device: EwonFlexyStructure, index: number, config = this.config): Promise<string> {
    console.clear(); // TODO remove after dev
    this.devLog('installAgent', { device, index, config });

    const isC8yDevice = device.hasOwnProperty('source') && !!device.source;
    const isT2mDevice = device.hasOwnProperty('id') && !!device.id;
    this.devLog('installAgent|connectionCheck', { isC8yDevice, isT2mDevice });

    try {
      if (isC8yDevice && !isT2mDevice) throw new Error('Not connected to Talk2M.');
      // if (!device.status || device.status !== 'online') throw new Error('Device is not online.');

      // 1. request SN (and online-check)
      this.progressLogger.sendDeviceSimpleMessage(
        device.name,
        index,
        '<b>Step 1</b> - Requesting Serial',
        'certificate'
      );
      const serial = await this.getSerial(device.name, index, device.encodedName);
      this.devLog('installAgent|serial', [index + 1, serial]);
      if (!serial) return;
      device.serial = serial; // TODO move?

      // 2. check if device was already connected via agent
      this.progressLogger.sendDeviceSimpleMessage(
        device.name,
        index,
        '<b>Step 2</b> - Check if device was already connected via agent.',
        'plug'
      );

      const connectedViaAgent = await this.checkIfDeviceConectedViaAgent(device, index, config);
      if (connectedViaAgent) {
        this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Device already connected via Agent.');
        return;
      } else {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          'Device has <span class="text-success">not been connected</span> via agent.',
          'check'
        );
      }

      // 3. check if files are already present on device
      this.progressLogger.sendDeviceSimpleMessage(device.name, index, '<b>Step 3</b> - Check for preexisting files', 'search');
      const filesExistAlready = await this.checkForLoadedFiles(device, index, config, 1);
      if (filesExistAlready) {
        this.progressLogger.sendDeviceErrorMessage(device.name, index, `File(s) already exist on device.`);
        return;
      }

      // 4. files
      this.progressLogger.sendDeviceSimpleMessage(device.name, index, `<b>Step 4</b> - Download files`, 'download-archive');
      const files = await this.loadFilesOntoDevice(device, index, config);
      this.devLog('installAgent|loadFilesOntoDevice', [index + 1, files]);
      if (!files) return;

      // 5. check files
      this.progressLogger.sendDeviceSimpleMessage(device.name, index, '<b>Step 5</b> - Download files to device', 'cloud-download');
      const filesLoaded = await this.checkForLoadedFiles(device, index, config);
      this.devLog('installAgent|checkForLoadedFiles', [index + 1, filesLoaded]);
      if (!filesLoaded) {
        this.progressLogger.sendDeviceErrorMessage(
          device.name,
          index,
          'Could not verify that all files were downloaded onto the device.'
        );
        return;
      }

      // 6. reboot
      this.progressLogger.sendDeviceSimpleMessage(device.name, index, '<b>Step 6</b> - Reboot', 'refresh');
      const reboot = await this.flexyService.reboot(device.encodedName, config);
      this.devLog('installAgent|reboot', [index + 1, reboot]);

      // wait for reboot to finish (poll for serial)
      const isOnline = await this.checkIfDeviceIsOnline(device.name, index, device.encodedName);
      if (!isOnline) {
        this.progressLogger.sendDeviceErrorMessage(device.name, index, `Device not online.`);
        return;
      }

      // TODO (check) flag agent installed if has agent fragment
      this.progressLogger.sendDeviceSimpleMessage(device.name, index, '<b>Step 7</b> - Update status', 'pencil');
      const hasAgentFragment = await this.hasAgentFragment(device);
      if (!hasAgentFragment) return;

      // 8. register device
      this.progressLogger.sendDeviceSimpleMessage(
        device.name,
        index,
        '<b>Step 8</b> - Register device',
        'cloud-checked'
      );
      // void this.flexyService.registerFlexy(device); // TODO get device group

      return Promise.resolve('done');
    } catch (error) {
      console.error('Failed to install', { error, device });
      const message = typeof error === 'string' ? error : error.message;
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Failed to install agent', message);
    }
  }

  install(devices: EwonFlexyStructure[], config: FlexySettings): Observable<ProgressMessage> {
    this.devLog('install', { devices, config });

    const devicePromises = [];
    return new Observable<ProgressMessage>((observer) => {
      this.progressLogger.observer$ = observer;

      // input validation
      if (!devices.length) this.progressLogger.sendErrorMessage('No eligible devices available.');
      if (!config.deviceUsername) this.progressLogger.sendErrorMessage('Device username missing.');
      if (!config.devicePassword) this.progressLogger.sendErrorMessage('Device password missing.');
      if (!config.url) {
        this.progressLogger.sendErrorMessage('File URLs missing.');
      } else {
        if (!config.url.connector || config.url.connector === '')
          this.progressLogger.sendErrorMessage('Connector file URL missing.');
        if (!config.url.jvmrun || config.url.jvmrun === '')
          this.progressLogger.sendErrorMessage('JVMrun file URL missing.');
      }

      // start install
      this.progressLogger.sendSimpleMessage('Starting install', 'rocket');
      this.progressLogger.total = devices.length;
      this.config = config;

      devices.forEach((device, index) => devicePromises.push(this.installAgent(device, index)));
      Promise.all(devicePromises).then(() => this.progressLogger.observer$.complete());
    });
  }
}
