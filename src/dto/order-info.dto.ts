import { Exclude, Expose, Transform } from 'class-transformer';


@Exclude()
export class OrderInfoDto {
  @Expose() orderId: number;
  @Expose() symbol: string;
  @Expose() status: string;
  @Expose() clientOrderId: string;
  @Expose() price: string;
  @Expose() avgPrice: string;
  @Expose() origQty: string;
  @Expose() executedQty: string;
  @Expose() cumQty: string;
  @Expose() cumQuote: string;
  @Expose() timeInForce: string;
  @Expose() type: string;
  @Expose() reduceOnly: boolean;
  @Expose() closePosition: boolean;
  @Expose() side: string;
  @Expose() positionSide: string;
  @Expose() stopPrice: string;
  @Expose() workingType: string;
  @Expose() priceProtect: boolean;
  @Expose() origType: string;
  @Expose() updateTime: number;
}



