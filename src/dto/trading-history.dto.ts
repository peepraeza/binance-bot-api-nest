import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class TradingHistoryDto {
  @Expose() sellDate: string;
  @Expose() avg: number;
  @Expose() win: number;
  @Expose() loss: number;
  @Expose() total: number;
}






