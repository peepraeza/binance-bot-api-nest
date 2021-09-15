import { Injectable } from '@nestjs/common';
import { TradingViewReqDto } from '../dtos/webhook/trading-view.req.dto';
import { LineBotService } from './line-bot.service';
import { BinanceInfoService } from './binance-info.service';

@Injectable()
export class BinanceOrderService {

  constructor(
    private readonly lineBotService: LineBotService,
    private readonly binanceInfoService: BinanceInfoService,
  ) {
  }


  async buySellPosition(reqDto: TradingViewReqDto): Promise<object> {
    console.log('from trading view');
    this.lineBotService.sendAlertMessage(reqDto);
    return reqDto;
  }

}
