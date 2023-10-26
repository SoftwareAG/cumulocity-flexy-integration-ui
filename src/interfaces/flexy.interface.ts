export interface FlexySettings {
  account?: string;
  username?: string;
  password?: string;
  tenant?: string;
  session?: string;
  token?: string;
  deviceUsername?: string;
  devicePassword?: string;
  deviceName?: string;
  url?: {
    connector: string;
    jvmrun: string;
    cumulocity?: string;
  };
  filesExist?: boolean;
  c8yHost?: string;
  c8yPort?: number;
  c8yTenant?: string;
  c8yUsername?: string;
  c8yPassword?: string;
  installProcessSkipSteps?: FlexyInstallSteps[];
}

export interface EwonFlexyStructure {
  id?: string; //ewon ids
  serial?: string;
  source?: string; // managed object source
  pool?: string;
  groups?: any[];
  name?: string;
  registered?: string;
  talk2m_integrated?: FlexyIntegrated;
  encodedName?: string;
  status?: string;
  description?: string;
  customAttributes?: Array<string>;
  m2webServer?: string;
  serialNumber?: string;
  agent?: {
    name: string;
    version: string;
    url: string;
  };
  lanDevices?: Array<{
    name?: string;
    description?: string;
    ip?: string;
    port?: number;
    protocol?: string;
  }>;
  ewonServices?: Array<{
    name?: string;
    description?: string;
    port?: number;
    protocol?: string;
  }>;
  dmLastSyncDate?: Date;
  c8yLastSyncDate?: Date;
}

export interface FlexyCommandFile {
  server: string;
  files: Array<string>;
}

export declare const enum FlexyIntegrated {
  Integrated = 'yes',
  Not_integrated = 'no'
}

export interface FlexyConnectorFile {
  name: string,
  download_url: string
}

export interface FlexyConnectorRelease {
  name: string;
  jar: FlexyConnectorFile,
  configuration: FlexyConnectorFile,
  jvmRun: FlexyConnectorFile
}

export interface t2mUrlOptions {
  account?: string;
  password?: string;
  session?: string;
  username?: string;
  deviceUsername?: string;
  devicePassword?: string;
  [key: string]: string | number | boolean;
}

export interface T2MPool {
  id: string; // FIXME fix in FlexyService.getEwons()
  name: string;
}

export interface T2MAccount {
  accountName: string;
  accountReference: string;
  accountType: string;
  company: string;
  customAttributes: string[];
  pools: T2MPool[];
  success: boolean;
}

export const FlexyInstallSteps = {
  REQUEST_SN: 'REQUEST_SN',
  WAS_CONNECTED: 'WAS_CONNECTED',
  FILES_EXIST: 'FILES_EXIST',
  DOWNLOAD_FILES: 'DOWNLOAD_FILES',
  CHECK_FILES_DOWNLOAD: 'CHECK_FILES_DOWNLOAD',
  REGISTER_DEVICE: 'REGISTER_DEVICE',
  REBOOT_DEVICE: 'REBOOT_DEVICE',
  SEND_CONFIG: 'SEND_CONFIG',
  ACCEPT_REGISTRATION: 'ACCEPT_REGISTRATION'
};
export type FlexyInstallSteps = (typeof FlexyInstallSteps)[keyof typeof FlexyInstallSteps];

export interface FlexyInstallProgressSteps {
  id: FlexyInstallSteps;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}
