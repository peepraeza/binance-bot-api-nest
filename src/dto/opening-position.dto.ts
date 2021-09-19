import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class OpeningPositionDataDto {
  @Expose() symbol: string;
  @Expose() positionSide: string;
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






