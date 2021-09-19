import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DateDurationDto {
  @Expose() years: number;
  @Expose() months: number;
  @Expose() days: number;
  @Expose() hours: number;
  @Expose() minutes: number;
}






