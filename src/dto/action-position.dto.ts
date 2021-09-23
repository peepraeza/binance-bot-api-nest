import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ActionPositionDto {
  @Expose() actionStatus: string;
  @Expose() transactionId: string;
  @Expose() markPrice: string;
}






