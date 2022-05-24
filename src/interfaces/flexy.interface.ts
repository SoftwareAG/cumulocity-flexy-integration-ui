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
}

export interface EwonFlexyStructure {
  id?: string; //ewon id
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

export interface t2mUrlOptions {
  account?: string;
  password?: string;
  session?: string;
  username?: string;
  deviceUsername?: string;
  devicePassword?: string;
  [key: string]: string;
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
