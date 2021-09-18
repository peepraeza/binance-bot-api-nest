import { Injectable } from '@nestjs/common';
import binance from '../configs/binance.config';
import { PositionDto } from '../dto/future-position.dto';

@Injectable()
export class BinanceInfoService {

  async getSpotBalance(): Promise<object> {
    const balance = await binance.spot.balance();
    console.log(balance);
    return balance;
  }

  async getFutureBalance(): Promise<object> {
    const balance = await binance.futures.balance();
    console.log(balance);
    return balance;
  }

  async getCurrentPosition(): Promise<PositionDto[]> {
    const positions = await binance.futures.positionRisk();
    const currentPosition:PositionDto[] = positions.filter(position => +position.positionAmt != 0);
    console.log(currentPosition);
    return currentPosition;
  }
}
