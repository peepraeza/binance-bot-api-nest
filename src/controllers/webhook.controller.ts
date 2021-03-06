import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { BinanceOrderService } from '../services/binance-order.service';
import { LineBotService } from '../services/line-bot.service';
import { TradingViewGuard } from '../guards/trading-view.guard';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { WebhookRequestBody } from '@line/bot-sdk';

@Controller('/webhook')
export class WebhookController {
  constructor(
    private readonly appService: AppService,
    private readonly binanceBotService: BinanceOrderService,
    private readonly lineBotService: LineBotService,
  ) {
  }

  @UseGuards(TradingViewGuard)
  @Post('/trading-view')
  async tradingViewWebhook(
    @Body() dto: TradingViewReqDto,
  ): Promise<void> {
    return await this.binanceBotService.actionPosition(dto);
  }

  @Post('/line')
  async lineWebhook(@Body() { events }: WebhookRequestBody): Promise<void> {
    return this.lineBotService.handleReplyMessage(events);
  }
}
