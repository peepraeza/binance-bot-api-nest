import { getConfig } from './config';
import * as ccxt from 'ccxt';

export const configFuture = {
  apiKey: getConfig('BINANCE_API_KEY'),
  secret: getConfig('BINANCE_API_SECRET'),
  enableRateLimit: true,
  options: {
    defaultType: 'future',
  },
};


const binanceFuture = new ccxt.binance(configFuture);

export default binanceFuture;
