import { Injectable } from '@nestjs/common';
import binance from '../configs/binance.config';
import { PositionDto } from '../dto/future-position.dto';
import fs = require('fs');
import { retry } from 'rxjs/operators';

@Injectable()
export class BinanceInfoService {

  async getSpotBalance(): Promise<object> {
    const balance = await binance.spot.balance();
    console.log(balance);
    return {};
  }

  async getFutureBalance(): Promise<object> {
    const balance = await binance.futures.balance();
    console.log(balance);
    return {};
    // return balance['USDT'];
  }

  async getCurrentPosition(): Promise<PositionDto[]> {
    const positions = await binance.futures.positionRisk();
    const currentPosition:PositionDto[] = positions.filter(position => +position.positionAmt > 0);
    console.log(currentPosition);
    return null;
  }
}
