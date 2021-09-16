import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@line/bot-sdk';
import { getConfig } from '../configs/config';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { BinanceInfoService } from './binance-info.service';
import lineClient from '../configs/line.config';
import * as Types from '@line/bot-sdk/lib/types';
import { QuickReply } from '@line/bot-sdk/lib/types';
import * as quickReply from '../template-message/quick-reply/quick-reply.json';
import { DEFAULT_MSG, FUTURE_BALANCE, SPOT_BALANCE } from '../constants/message.constant';

@Injectable()
export class LineBotService {
  private readonly lineUserId;
  private readonly lineGroupId;

  constructor(
    private readonly binanceInfoService: BinanceInfoService,
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
  }

  async handleReplyMessage(events: any[]): Promise<any> {
    console.log('from line');
    const messageEvent: MessageEvent = events[0];
    const { message, replyToken } = messageEvent;
    let replyText = '';
    if (message.type == 'text') {
      if (message.text == SPOT_BALANCE) {
        const resp = await this.binanceInfoService.getSpotBalance();
        replyText = JSON.stringify(resp);
      } else if (message.text == FUTURE_BALANCE) {
        const resp = await this.binanceInfoService.getFutureBalance();
        replyText = JSON.stringify(resp);
      } else {
        replyText = DEFAULT_MSG;
      }
    } else {
      replyText = DEFAULT_MSG;
    }
    const quickReplyMessage = [
      {
        type: 'text',
        text: replyText,
      },
    ] as Types.Message[];
    quickReplyMessage[0].quickReply = quickReply['quickReply'] as QuickReply;
    return lineClient.replyMessage(replyToken, quickReplyMessage);
  }

  sendAlertMessage(req: TradingViewReqDto): any {
    const { side, symbol, openPrice } = req;
    const coin = symbol.replace('USDT', '');
    const text = `Alert ${coin}\nStatus: ${side}\nEntry Price: ${openPrice}`;
    return lineClient.pushMessage(this.lineUserId, { type: 'text', text: text });
  }
}
