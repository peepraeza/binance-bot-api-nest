import moment from 'moment-timezone';
import { ASIA_BANGKOK, YYYY_MM_DD_HH_MM_SS } from '../constants/constants';

export function dateToString(date: Date, format = YYYY_MM_DD_HH_MM_SS) {
  return moment(date).tz(ASIA_BANGKOK).format(format);
}
