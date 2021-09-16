import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class AssetDto {
  @Expose() asset: string;
  @Expose() walletBalance: string;
  @Expose() unrealizedProfit: string;
  @Expose() marginBalance: string;
  @Expose() maintMargin: string;
  @Expose() initialMargin: string;
  @Expose() positionInitialMargin: string;
  @Expose() openOrderInitialMargin: string;
  @Expose() maxWithdrawAmount: string;
  @Expose() crossWalletBalance: string;
  @Expose() crossUnPnl: string;
  @Expose() availableBalance: string;
  @Expose() marginAvailable: boolean;
  @Expose() updateTime: string;
}

@Exclude()
export class PositionDto {
  @Expose() symbol: string;
  @Expose() initialMargin: string;
  @Expose() maintMargin: string;
  @Expose() unrealizedProfit: string;
  @Expose() positionInitialMargin: string;
  @Expose() openOrderInitialMargin: string;
  @Expose() leverage: string;
  @Expose() isolated: boolean;
  @Expose() entryPrice: string;
  @Expose() maxNotional: string;
  @Expose() positionSide: string;
  @Expose() positionAmt: string;
  @Expose() notional: string;
  @Expose() isolatedWallet: string;
  @Expose() updateTime: string;
}

@Exclude()
export class FuturePositionDto {
  @Expose() feeTier: string;
  @Expose() canTrade: boolean;
  @Expose() canDeposit: boolean;
  @Expose() canWithdraw: boolean;
  @Expose() updateTime: string;
  @Expose() totalInitialMargin: string;
  @Expose() totalMaintMargin: string;
  @Expose() totalWalletBalance: string;
  @Expose() totalUnrealizedProfit: string;
  @Expose() totalMarginBalance: string;
  @Expose() totalPositionInitialMargin: string;
  @Expose() totalOpenOrderInitialMargin: string;
  @Expose() totalCrossWalletBalance: string;
  @Expose() totalCrossUnPnl: string;
  @Expose() availableBalance: string;
  @Expose() maxWithdrawAmount: string;

  @Expose()
  @Type(() => AssetDto)
  assets: AssetDto[];

  @Expose()
  @Type(() => PositionDto)
  positions: PositionDto[];
}


