import { Injectable } from '@angular/core';
import { IExternalIdentity, IManagedObject } from '@c8y/client';
import {
  DEVICE_AGENT_FRAGMENT,
  EXTERNALID_TALK2M_SERIALTYPE,
  FLEXY_EXTERNALID_FLEXY_PREFIX
} from '@flexy/constants/flexy-integration.constants';
import { ProgressMessage } from '@flexy/models/c8y-custom-objects.model';
import { EwonFlexyStructure, FlexyCommandFile, FlexySettings } from '@flexy/models/flexy.model';
import { FlexyInstallSteps } from '@flexy/models/install.model';
import { Observable } from 'rxjs';
import { ExternalIDService } from './external-id.service';
import { FlexyService } from './flexy.service';
import { ProgressLoggerService } from './progress-logger.service';

@Injectable({ providedIn: 'root' })
export class InstallAgentService {
  count = 0;
  url: string;
  version: string;
  form: string;
  config: FlexySettings;

  private filePollAttempts = 30;
  private filePollInterval = 10; // in sec
  private rebootAttempts = 30;
  private rebootInterval = 10; // in sec
  private initialRebootDelay = 10; // in sec

  constructor(
    private flexyService: FlexyService,
    private externalIDService: ExternalIDService,
    private progressLogger: ProgressLoggerService
  ) {}

  install(devices: EwonFlexyStructure[], config: FlexySettings): Observable<ProgressMessage> {
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

  // helper
  private sleep(seconds): Promise<NodeJS.Timer> {
    // TODO display timeout between requests to user (progress-bar?)
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private getFilenameFromUrl(url: string): string {
    return url.split('/').pop();
  }

  private generateFlexCommandFileConfig(file: string): FlexyCommandFile {
    const url = new URL(file);
    return {
      server: url.origin,
      files: [url.pathname]
    } as FlexyCommandFile;
  }

  private deviceHasAgentFragment(deviceMO: IManagedObject): boolean {
    return !!deviceMO[DEVICE_AGENT_FRAGMENT];
  }

  // step handling
  private async getSerial(
    deviceName: string,
    index: number,
    encodedName: string,
    config = this.config,
    log = true
  ): Promise<string> {
    try {
      return await this.flexyService.getSerial(encodedName, config.deviceUsername, config.devicePassword);
    } catch (error: any) {
      if (log) {
        console.error('Could not obtain serialnumber', error);
        this.progressLogger.sendDeviceErrorMessage(deviceName, index, 'Could not obtain serialnumber.', error.message);
      }
      return null;
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
    let serial: string;

    for (let i = 1; i < attempts; i += 1) {
      this.progressLogger.sendDeviceSimpleMessage(
        deviceName,
        index,
        `Waiting for device to reboot.<br><b>Attempt ${i} of ${attempts}</b>`,
        'clock1'
      );

      try {
        serial = await this.getSerial(deviceName, index, encodedName, config, false);
      } catch (error) {
        console.info('device online check response', { attempt: i, deviceName, error });
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
    let flexy: IExternalIdentity;

    try {
      flexy = await this.flexyService.getExternalID(device.serial);
    } catch (error) {
      flexy = null;
    }

    let talk2m: IExternalIdentity;
    try {
      talk2m = await this.flexyService.getExternalID(device.serial, EXTERNALID_TALK2M_SERIALTYPE);
    } catch (error) {
      talk2m = null;
    }

    return [flexy, talk2m];
  }

  private async checkIfDeviceConectedViaAgent(device: EwonFlexyStructure): Promise<boolean> {
    const [flexy, talk2m] = await this.getExternalIDs(device);

    if (flexy) {
      /*
      If there already is a device MO with the external ID "HMS-Flexy-{SERIAL}" that also has the agent fragment:
        - add "HMS-Talk2M-{EwonID} if not present
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(flexy);
      if (deviceMO && this.deviceHasAgentFragment(deviceMO)) {
        if (!talk2m) {
          void (await this.flexyService.createExternalIDForDevice(
            deviceMO,
            device.serial,
            EXTERNALID_TALK2M_SERIALTYPE
          ));
        }
        return Promise.reject('Already connected: Device MO has an external Flexy ID.');
      }
    } else if (talk2m) {
      /*
        If there already is a device MO with the external ID "HMS-Talk2M-{EwonID} and a different "HMS-Felxy-{SERIAL}":
        - discontinue the agent installation process
      */
      const deviceMO = await this.externalIDService.getDeviceByIdentity(talk2m);
      const externalIDs = await await this.externalIDService.getExternalIDsForDevice(deviceMO);
      const flexyIDs = externalIDs.filter((id) => id.externalId.indexOf(FLEXY_EXTERNALID_FLEXY_PREFIX) >= 0);

      if (flexyIDs.length) return Promise.reject('Already connected: Device MO has an external Talk2M ID.');
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
    this.progressLogger.sendDeviceSimpleMessage(
      deviceName,
      index,
      `<b>Step ${step}</b> - Loading file from<br><code>${filename}</code>`,
      'download-archive'
    );
    try {
      return await this.flexyService.installSoftware(
        this.generateFlexCommandFileConfig(filename),
        deviceEncodedName,
        config
      );
    } catch (error: any) {
      console.error('Could not install file', error);
      this.progressLogger.sendDeviceErrorMessage(
        deviceName,
        index,
        `Could not install file <code>${filename}</code>.`,
        error.message
      );
      return null;
    }
  }

  private async loadFilesOntoDevice(device: EwonFlexyStructure, index: number, config = this.config): Promise<boolean> {
    try {
      // connector
      const connector = await this.loadFile(device.name, index, '4.1', device.encodedName, config.url.connector);
      if (!connector) return false;

      // JVMrun
      const jvmrun = await this.loadFile(device.name, index, '4.2', device.encodedName, config.url.jvmrun);
      if (!jvmrun) return false;

      // (optional) c8y config
      if (config.url.hasOwnProperty('cumulocity') && !!config.url.cumulocity) {
        const c8yconfig = await this.loadFile(device.name, index, '4.3', device.encodedName, config.url.cumulocity);
        if (!c8yconfig) return false;
      }

      return true;
    } catch (error: any) {
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Could not reboot device', error.message);
      return false;
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
    const filename = this.getFilenameFromUrl(file);
    let fileExists = false;

    // interval polling
    for (let i = 1; i <= attempts; i++) {
      try {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          `Polling for file <span class="text-warning">"${filename}"</span>.<br><b>Attempt ${i} of ${attempts}</b>`,
          'file-view'
        );
        fileExists = await this.flexyService.downloadSoftware(filename, device.name, config);
      } catch (error: any) {
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
        if (i >= attempts) {
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

    return null;
  }

  private checkForLoadedFiles(
    device: EwonFlexyStructure,
    index: number,
    config = this.config,
    attempts = this.filePollAttempts
  ): Promise<boolean> {
    const files = [
      this.pollForFile(device, index, config, config.url.connector, attempts),
      this.pollForFile(device, index, config, config.url.jvmrun, attempts)
    ];

    if (config.url.hasOwnProperty('cumulocity') && !!config.url.cumulocity) {
      files.push(this.pollForFile(device, index, config, config.url.cumulocity, attempts));
    }

    return Promise.all(files).then((res) => res.reduce((p, c) => p && c, true));
  }

  private async registerFlexy(device: EwonFlexyStructure, index: number): Promise<boolean> {
    // device was already registered?
    const isRegistered = this.flexyService.isRegistered(device);

    if (isRegistered) {
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Device is already registered.');
      return false;
    }

    // create request
    try {
      await this.flexyService.createRegistration(device);

      return true;
    } catch (error) {
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'ERR.');
      return false;
    }
  }

  private async sendConnectionConfig(device: EwonFlexyStructure, config = this.config): Promise<boolean> {
    return await this.flexyService.sendConfig(device.name, config);
  }

  private async acceptRegistration(device: EwonFlexyStructure): Promise<boolean> {
    return await this.flexyService.acceptRegistration(device);
  }

  private skipStepCheck(step: FlexyInstallSteps, config = this.config.installProcessSkipSteps): boolean {
    return config.includes(step);
  }

  // install process
  private async installAgent(
    device: EwonFlexyStructure,
    index: number,
    config = this.config
  ): Promise<string | boolean> {
    const isC8yDevice = device.hasOwnProperty('source') && !!device.source;
    const isT2mDevice = device.hasOwnProperty('id') && !!device.id;

    try {
      if (isC8yDevice && !isT2mDevice) throw new Error('Not connected to Talk2M.');
      if (!device.status || device.status !== 'online') throw new Error('Device is not online.');

      // 1. request SN (and online-check)
      if (!this.skipStepCheck(FlexyInstallSteps.REQUEST_SN)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 1</b> - Requesting Serial',
          'certificate'
        );
        const serial = await this.getSerial(device.name, index, device.encodedName);

        if (!serial) return null;
        device.serial = serial;
      }

      // 2. check if device was already connected via agent
      if (!this.skipStepCheck(FlexyInstallSteps.WAS_CONNECTED)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 2</b> - Check if device was already connected via agent.',
          'plug'
        );
        const connectedViaAgent = await this.checkIfDeviceConectedViaAgent(device);

        if (connectedViaAgent) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Device already connected via Agent.');
          return null;
        } else {
          this.progressLogger.sendDeviceSimpleMessage(
            device.name,
            index,
            'Device has <span class="text-success">not been connected</span> via agent.',
            'check'
          );
        }
      }

      // 3. check if files are already present on device
      if (!this.skipStepCheck(FlexyInstallSteps.FILES_EXIST)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 3</b> - Check for preexisting files',
          'search'
        );
        const filesExistAlready = await this.checkForLoadedFiles(device, index, config, 1);

        if (filesExistAlready) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, `File(s) already exist on device.`);
          return null;
        }
      }

      // 4. files
      if (!this.skipStepCheck(FlexyInstallSteps.DOWNLOAD_FILES)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          `<b>Step 4</b> - Download files`,
          'download-archive'
        );
        const files = await this.loadFilesOntoDevice(device, index, config);

        if (!files) return null;
      }

      // 5. check files
      if (!this.skipStepCheck(FlexyInstallSteps.CHECK_FILES_DOWNLOAD)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 5</b> - Check for downloaded files',
          'cloud-download'
        );
        const filesLoaded = await this.checkForLoadedFiles(device, index, config);

        if (!filesLoaded) {
          this.progressLogger.sendDeviceErrorMessage(
            device.name,
            index,
            'Could not verify that all files were downloaded onto the device.'
          );
          return null;
        }
      }

      // 6. register device
      if (!this.skipStepCheck(FlexyInstallSteps.REGISTER_DEVICE)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 6</b> - Register device',
          'cloud-checked'
        );
        const registered = await this.registerFlexy(device, index);

        if (!registered) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Could not register the device.');
          return null;
        }
      }

      // 7. reboot
      if (!this.skipStepCheck(FlexyInstallSteps.REBOOT_DEVICE)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          `<b>Step 7</b> - Reboot<br><small>Let's give the device a ${this.initialRebootDelay}sec headstart</small>`,
          'refresh'
        );
        await this.sleep(this.initialRebootDelay);

        await this.flexyService.reboot(device.encodedName, config);

        // wait for reboot to finish (poll for serial)
        const isOnline = await this.checkIfDeviceIsOnline(device.name, index, device.encodedName);
        if (!isOnline) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Device not online.');
          return null;
        }
      }

      // 8. send config
      if (!this.skipStepCheck(FlexyInstallSteps.SEND_CONFIG)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 8</b> - Send connection config to device',
          'file-settings' // settings
        );
        const connectionConfig = await this.sendConnectionConfig(device, config);

        if (!connectionConfig) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Could not send config to device.');
        }
      }

      // step 9 wait a bit
      if (
        !this.skipStepCheck(FlexyInstallSteps.SEND_CONFIG) ||
        !this.skipStepCheck(FlexyInstallSteps.ACCEPT_REGISTRATION)
      ) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          `<b>Step 9</b> - Config send delay<br><small>Let's give the device another 20sec for chages to take effect</small>`,
          'refresh'
        );
        await this.sleep(20);
      }

      // 10. accept registration
      if (!this.skipStepCheck(FlexyInstallSteps.ACCEPT_REGISTRATION)) {
        this.progressLogger.sendDeviceSimpleMessage(
          device.name,
          index,
          '<b>Step 10</b> - Accept device registration',
          'check'
        );

        const accept = await this.acceptRegistration(device);

        if (!accept) {
          this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Could not accept device registration.');
        }
      }

      // write device.registered = FlexyIntegrated.Integrated;

      return Promise.resolve('done');
    } catch (error) {
      console.error('Failed to install', { error, device });
      // const message = typeof error === 'string' ? error : error.message; // TODO
      const message = error as string;
      this.progressLogger.sendDeviceErrorMessage(device.name, index, 'Failed to install agent', message);
    }

    return true;
  }
}
