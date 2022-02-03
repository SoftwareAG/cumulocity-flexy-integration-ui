import { IFetchOptions } from '@c8y/client';

export const FLEXY_PATH = 'flexy';
export const FLEXY_REGISTRATION_PATH = 'registration';
export const FLEXY_SETTINGS_PATH = 'settings';
export const FLEXY_DATAMAILBOX_PATH = 'datamailbox';

export const FLEXY_TENANTOPTIONS_CATEGORY = 'flexy';

export const FLEXY_SERIALTYPE = 'talk2m_id';
export const FLEXY_EXTERNALID_PREFIX = 'HMS-Talk2M-';
export const FLEXY_DEVICETYPE = 'c8y_EwonFlexy';

export const TALK2M_BASEURL = 'https://m2web.talk2m.com/t2mapi';
export const TALK2M_DEVELOPERID = 'c86cfaf7-f353-40c5-9263-8cacbfd411a2'

export const DM_FRAGMENTTYPE_MO = 'c8y_HMSOnloadingJob';

export const C8Y_MICROSERVICE_ENDPOINT = {
    URL: { 
        GET_EWONS: '/service/ewon-flexy-integration/datamailbox/getewons?t2mtoken={t2mtoken}&t2mdevid={t2mdevid}',
        SYNC_DATA: '/service/ewon-flexy-integration/datamailbox/syncdata?t2mtoken={t2mtoken}&t2mdevid={t2mdevid}&tenantId={tenantId}',
    },
    VARIABLE: {
        TOKEN: '{t2mtoken}',
        DEVID: '{t2mdevid}',
        TENANTID: '{tenantId}'
      } ,
    APPKEY: 'ewon-flexy-integration'
}

export const GET_OPTIONS: IFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };