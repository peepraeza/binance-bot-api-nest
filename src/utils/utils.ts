import moment from 'moment-timezone';
import { ASIA_BANGKOK, YYYY_MM_DD_HH_MM_SS } from '../constants/constants';
import { plainToClass } from 'class-transformer';
import { DateDurationDto } from '../dto/date-duration.dto';

export function dateToString(date: Date | string, format = YYYY_MM_DD_HH_MM_SS): string {
  return moment(date).tz(ASIA_BANGKOK).format(format);
}

export function countDecimals(value: number) {
  if ((value % 1) != 0)
    return value.toString().split('.')[1].length;
  return 0;
}

export function duration(fromDate: string, toDate: string): string {
  const durationData = moment.duration(moment(toDate).diff(moment(fromDate)));
  const duration = plainToClass(DateDurationDto, durationData['_data']);
  let text = '';
  text += duration.years ? `${duration.years} ปี ` : '';
  text += duration.months ? `${duration.months} เดือน ` : '';
  text += duration.days ? `${duration.days} วัน ` : '';
  text += duration.hours ? `${duration.hours} ชม. ` : '';
  text += duration.minutes ? `${duration.minutes} นาที ` : '';
  return text.trim();
}

export function validateTimeRange(fromDate: Date, range: number): boolean {
  const now = moment(new Date()); //todays date
  const end = moment(fromDate); // another date
  const duration = moment.duration(now.diff(end));
  const minutes = duration.asMinutes();
  console.log(`validate time range is more than ${range}?: ${minutes}`)
  return minutes <= range;
}
