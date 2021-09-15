import { getConfig } from './config';
import * as ccxt from 'ccxt';


export const configSpot = {
  apiKey: getConfig('BINANCE_API_KEY'),
  secret: getConfig('BINANCE_API_SECRET'),
};

const binanceSpot = new ccxt.binance(configSpot);

export default binanceSpot;
