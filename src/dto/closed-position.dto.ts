import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ClosedPositionDto {
  @Expose() transactionId: number;
  @Expose() symbol: string;
  @Expose() positionSide: string;
  @Expose() buyPrice: number;
  @Expose() closedPrice: number;
  @Expose() quantity: number;
  @Expose() pl: number;
  @Expose() plPercentage: number;
  @Expose() closedTime: string;
  @Expose() duration: string;
  @Expose() resultStatus: string;
}






