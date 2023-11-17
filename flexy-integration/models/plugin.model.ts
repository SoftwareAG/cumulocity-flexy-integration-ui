export interface PluginConfig {
  session: string;
  account: string;
  username: string;
  credentialspassword?: string;
  tenant: string;
  // @deprecated use talk2mSessionService.account instead
  'talk2m.accountName': string; // TODO refactor
  'talk2m.accountReference': string;
  'talk2m.accountType': string; // TODO enum 'Pro'
  'talk2m.company': string;
  'talk2m.customAttributes': string;
  'talk2m.pools': string; // TODO check
  'talk2m.success': boolean;
}
