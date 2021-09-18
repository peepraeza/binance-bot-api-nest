import moment from 'moment-timezone';
import { ASIA_BANGKOK, YYYY_MM_DD_HH_MM_SS } from '../constants/constants';

export function dateToString(date: Date, format = YYYY_MM_DD_HH_MM_SS) {
  return moment(date).tz(ASIA_BANGKOK).format(format);
}

export function getTodayDate() {
  return moment().tz(ASIA_BANGKOK).toDate();
}

export function countDecimals(value: number) {
  if ((value % 1) != 0)
    return value.toString().split('.')[1].length;
  return 0;
}
