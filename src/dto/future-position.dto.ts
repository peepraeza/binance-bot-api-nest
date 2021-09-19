import { Exclude, Expose} from 'class-transformer';


@Exclude()
export class PositionDto {
  @Expose() symbol: string;
  @Expose() positionAmt: string;
  @Expose() entryPrice: string;
  @Expose() markPrice: string;
  @Expose() unRealizedProfit: string;
  @Expose() liquidationPrice: string;
  @Expose() leverage: string;
  @Expose() maxNotionalValue: string;
  @Expose() marginType: string;
  @Expose() isolatedMargin: string;
  @Expose() isAutoAddMargin: string;
  @Expose() positionSide: string;
  @Expose() notional: string;
  @Expose() isolatedWallet: string;
  @Expose() updateTime: number;
}



