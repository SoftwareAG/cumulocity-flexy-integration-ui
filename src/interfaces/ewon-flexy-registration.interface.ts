export interface FlexySettings { 
    account?: string,
    username?: string,
    password?: string
    tenant?: string,
    session?: string,
    token?: string,
    device_user?: string
    device_pass?: string,
    device_name?: string,
 } 
 export interface EwonFlexyStructure {
    id: string | number;
    pool?: string;
    name?: string;
    registered?:string;
    encodedName?: string;
    status?: string;
    description?: string;
    customAttributes?: Array<string>;
    m2webServer?: string;
    serialNumber?: string;
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
    dmLastSyncDate?:Date;
    c8yLastSyncDate?:Date;
  }

  export declare const enum FlexyIntegrated {
    Integrated = "yes",
    Not_integrated = "no"
}