import { Exclude, Expose, Type } from 'class-transformer';
import { ClosedPositionDto } from './closed-position.dto';
import { BuyPositionDto } from './buy-position.dto';

@Exclude()
export class SwapPositionDto {
  @Expose() symbol: string;

  @Expose()
  @Type(() => ClosedPositionDto)
  closedPosition: ClosedPositionDto;

  @Expose()
  @Type(() => BuyPositionDto)
  buyPosition: BuyPositionDto;

}






