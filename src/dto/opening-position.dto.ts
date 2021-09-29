import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class OpeningPositionDataDto {
  @Expose() transactionId: number;
  @Expose() symbol: string;
  @Expose() positionSide: string;
  @Expose() quantity: number;
  @Expose() profitLoss: number;
  @Expose() entryPrice: number;
  @Expose() markPrice: number;
  @Expose() profitLossPercentage: number;
  @Expose() duration: string;
}

@Exclude()
export class OpeningPositionDto {
  @Expose()
  @Type(() => OpeningPositionDataDto)
  position: OpeningPositionDataDto[];

  @Expose() updateTime: string;
}






