import { getConfig } from './config';
import { Client, ClientConfig } from '@line/bot-sdk';

export const clientConfig: ClientConfig = {
  channelAccessToken: getConfig('LINE_CHANNEL_ACCESS_TOKEN'),
  channelSecret: getConfig('LINE_CHANNEL_SECRET'),
};
const lineClient = new Client(clientConfig);

export default lineClient;
