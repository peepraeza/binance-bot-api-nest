import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ClosedPositionDto {
  @Expose() symbol: string;
  @Expose() positionSide: string;
  @Expose() closedPrice: number;
  @Expose() pl: number;
  @Expose() plPercentage: number;
  @Expose() closedTime: string;
  @Expose() duration: string;
  @Expose() resultStatus: string;
}






