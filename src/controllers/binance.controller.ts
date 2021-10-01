import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceOrderService } from '../services/binance-order.service';
import { LineBotService } from '../services/line-bot.service';

@Controller('/api/binance')
export class BinanceController {
  constructor(
    private readonly binanceOrderService: BinanceOrderService,
    private readonly lineBotService: LineBotService,
  ) {
  }

  @Get('/balance/spot')
  async getSpotBalance(): Promise<object> {
    return this.binanceOrderService.getSpotBalance();
  }

  @Get('/balance/future')
  async getFutureBalance(): Promise<object> {
    return await this.binanceOrderService.getFutureBalance();
  }

  // @Get('/price/:symbol')
  // async getMarkPrice(
  //   @Param('symbol') symbol: string,
  // ): Promise<number> {
  //   return this.binanceOrderService.calculateQuantity(symbol);
  // }

  // @Get('/current-position')
  // async getCurrentPosition(): Promise<object> {
  //   return this.binanceOrderService.getCurrentPosition();
  // }

  // @Get('/test')
  // async sendMsg(): Promise<void> {
  //   return this.lineBotService.sendAlertSignalMessage2();
  // }

}
