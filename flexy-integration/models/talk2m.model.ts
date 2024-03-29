export const TALK2M_BASEURL = 'https://m2web.talk2m.com/t2mapi';
export const TALK2M_DEVELOPERID = 'c86cfaf7-f353-40c5-9263-8cacbfd411a2'; // TODO move to TO?

export enum Talk2mParameterParams {
  DEVELOPER_ID = 't2mdeveloperid',
  SESSION = 't2msession',
  ACCOUNT = 't2maccount',
  USERNAME = 't2musername',
  PASSWORD = 't2mpassword',
  DEVICE_USERNAME = 't2mdeviceusername',
  DEVICE_PASSWORD = 't2mdevicepassword',
}

export interface Talk2MUrlOptions {
  account?: string;
  password?: string;
  session?: string;
  username?: string;
  deviceUsername?: string;
  devicePassword?: string;
  [key: string]: string | number | boolean;
}

export interface Talk2MPool {
  id: string; // FIXME fix in FlexyService.getEwons()
  name: string;
}

export interface Talk2MAccount {
  accountName: string;
  accountReference: string;
  accountType: string;
  company: string;
  customAttributes: string[];
  pools: Talk2MPool[];
  success: boolean;
}
