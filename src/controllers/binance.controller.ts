import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceOrderService } from '../services/binance-order.service';
import { BinanceInfoService } from '../services/binance-info.service';
import { TradingHistoryDto } from '../dto/trading-history.dto';
import { LineBotService } from '../services/line-bot.service';

@Controller('/api/binance')
export class BinanceController {
  constructor(
    private readonly binanceInfoService: BinanceInfoService,
    private readonly binanceOrderService: BinanceOrderService,
    private readonly lineBotService: LineBotService,
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

  @Get('/price/:symbol')
  async getMarkPrice(
    @Param('symbol') symbol: string,
  ): Promise<number> {
    return this.binanceOrderService.calculateQuantity(symbol);
  }

  @Get('/current-position')
  async getCurrentPosition(): Promise<object> {
    return this.binanceInfoService.getTestCurrentPosition();
  }

  @Get('/save-history')
  async saveTradingHistory(): Promise<void> {
    return this.binanceInfoService.batchSaveHistoryInfo();
  }

  @Get('/test')
  async sendMsg(): Promise<void> {
    return this.lineBotService.sendAlertSignalMessage2();
  }

}
