import { IFetchOptions } from '@c8y/client';

export const FLEXY_PATH = 'flexy';
export const FLEXY_REGISTRATION_PATH = 'registration';
export const FLEXY_SETTINGS_PATH = 'settings';
export const FLEXY_DATAMAILBOX_PATH = 'datamailbox';

export const FLEXY_TENANTOPTIONS_CATEGORY = 'flexy';

export const FLEXY_SERIALTYPE = 'flexy_id';
export const FLEXY_EXTERNALID_PREFIX = 'flexy_';
export const FLEXY_DEVICETYPE = 'c8y_EwonFlexy';

export const TALK2M_BASEURL = 'https://m2web.talk2m.com/t2mapi';

export const C8Y_MICROSERVICE_ENDPOINT = {
    URL: { 
        GET_EWONS: '/service/ewon-talk2m-integration/datamailbox/getewons?t2mtoken={t2mtoken}&t2mdevid={t2mdevid}',
    },
    VARIABLE: {
        TOKEN: '{t2mtoken}',
        DEVID: '{t2mdevid}',
      } ,
    APPKEY: 'ewon-talk2m-integration'
}

export const GET_OPTIONS: IFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };