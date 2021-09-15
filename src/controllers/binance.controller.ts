import { Controller, Get } from '@nestjs/common';
import { BinanceOrderService } from '../services/binance-order.service';
import { BinanceInfoService } from '../services/binance-info.service';

@Controller('/api/binance')
export class BinanceController {
  constructor(
    private readonly binanceInfoService: BinanceInfoService,
  ) {
  }

  @Get('/balance/spot')
  async getSpotBalance(): Promise<object> {
    return this.binanceInfoService.getSpotBalance();
  }

  @Get('/balance/future')
  async getFutureBalance(): Promise<object> {
    return this.binanceInfoService.getFutureBalance();
  }
}
