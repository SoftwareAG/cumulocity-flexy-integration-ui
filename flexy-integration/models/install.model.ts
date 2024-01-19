export const FlexyInstallSteps = {
  REQUEST_SN: 'REQUEST_SN',
  WAS_CONNECTED: 'WAS_CONNECTED',
  FILES_EXIST: 'FILES_EXIST',
  DOWNLOAD_FILES: 'DOWNLOAD_FILES',
  CHECK_FILES_DOWNLOAD: 'CHECK_FILES_DOWNLOAD',
  REGISTER_DEVICE: 'REGISTER_DEVICE',
  ADD_EXTERNAL_ID: 'ADD_EXTERNAL_ID',
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
