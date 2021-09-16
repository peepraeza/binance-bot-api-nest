import { getConfig } from './config';
import Binance = require('node-binance-api-ext');

const binance = Binance({
  APIKEY: getConfig('BINANCE_API_KEY'),
  APISECRET: getConfig('BINANCE_API_SECRET'),
});

export default binance;
