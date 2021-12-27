export interface FlexySettings { 
    account?: string,
    username?: string,
    password?: string,
    devId?: string,
    tenant?: string,
    session?: string,
 } 
 export interface EwonFlexyStructure {
    id: string | number;
    pool?: string;
    name?: string;
    encodedName?: string;
    status?: string;
    description?: string;
    customAttributes?: Array<string>;
    m2webServer?: string;
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
  }