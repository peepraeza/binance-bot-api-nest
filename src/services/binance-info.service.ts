import { Injectable } from '@nestjs/common';
import binanceFuture from '../configs/binance-future.config';
import binanceSpot from '../configs/binance-spot.config';
import { FuturePositionDto, PositionDto } from '../dtos/future-position.dto';

@Injectable()
export class BinanceInfoService {

  async getSpotBalance(): Promise<object> {
    const balance = await binanceSpot.fetchBalance();
    const free = balance['free'];
    const mapKey = {};
    for (const prop in free) {
      if (free[prop] > 0) {
        mapKey[prop] = free[prop];
      }
    }
    return mapKey;
  }

  async getFutureBalance(): Promise<object> {
    const balance = await binanceFuture.fetchBalance();
    return balance['USDT'];
  }

  async getCurrentPosition(): Promise<PositionDto[]> {
    const balance = await binanceFuture.fetchBalance();
    const futurePositionDto: FuturePositionDto = balance['info'];
    return futurePositionDto.positions.filter(position => +position.positionAmt > 0);
  }
}
