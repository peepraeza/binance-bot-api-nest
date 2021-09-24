import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ActionPositionDto {
  @Expose() symbol: string;
  @Expose() actionStatus: string;
  @Expose() transactionId: number;
  @Expose() markPrice: number;
  @Expose() isConfirmed: boolean;
  @Expose() actionTime: string;
}






