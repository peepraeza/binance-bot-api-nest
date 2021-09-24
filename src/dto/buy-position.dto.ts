import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BuyPositionDto {
  @Expose() symbol: string;
  @Expose() positionSide: string;
  @Expose() buyDate: string;
  @Expose() buyPrice: number;
  @Expose() quantity: number;
}






