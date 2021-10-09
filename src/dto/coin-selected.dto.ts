import { Exclude, Expose} from 'class-transformer';

@Exclude()
export class CoinSelectedDto {
  @Expose() coin: string;
  @Expose() leverage: number;
  @Expose() limitPrice: number;
}







