import { Injectable } from '@nestjs/common';
import { FlexMessage, Message, MessageEvent, QuickReply } from '@line/bot-sdk';
import { getConfig } from '../configs/config';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { BinanceInfoService } from './binance-info.service';
import lineClient from '../configs/line.config';
import * as Types from '@line/bot-sdk/lib/types';
import * as quickReply from '../constant-json/quick-reply/quick-reply.json';
import { CURRENT_POSITION, DEFAULT_MSG, FUTURE_BALANCE, SPOT_BALANCE } from '../constants/message.constant';
import { GenerateMessageService } from './generate-message.service';

@Injectable()
export class LineBotService {
  private readonly lineUserId;
  private readonly lineGroupId;

  constructor(
    private readonly binanceInfoService: BinanceInfoService,
    private readonly generateMessageService: GenerateMessageService,
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
  }

  async handleReplyMessage(events: any[]): Promise<any> {
    console.log('from line');
    const messageEvent: MessageEvent = events[0];
    const { message, replyToken } = messageEvent;
    let replyText = DEFAULT_MSG;
    if (message.type == 'text') {
      if (message.text == SPOT_BALANCE) {
        const resp = await this.binanceInfoService.getSpotBalance();
        replyText = JSON.stringify(resp);
      } else if (message.text == FUTURE_BALANCE) {
        const resp = await this.binanceInfoService.getFutureBalance();
        replyText = JSON.stringify(resp);
      } else if (message.text == CURRENT_POSITION) {
        const resp = await this.binanceInfoService.getCurrentPosition();
        replyText = JSON.stringify(resp);
      }
    }
    const msg = this.generateMessage(replyText);
    return lineClient.replyMessage(replyToken, msg);
  }

  sendAlertMessage(req: TradingViewReqDto): any {
    const flexMessage = this.generateFlexMessage(req);
    return lineClient.pushMessage(this.lineUserId, flexMessage);
  }

  generateMessage(replyText: string): Message[] {
    return [
      {
        type: 'text',
        text: replyText,
        quickReply: quickReply['quickReply'],
      },
    ] as Types.Message[];
  }

  generateFlexMessage(data: TradingViewReqDto): FlexMessage {
    const coin = data.symbol.replace('USDT', '');
    const flex = this.generateMessageService.generateFlexMessage({ ...data, symbol: coin });
    return {
      type: 'flex',
      altText: `${coin} ${data.side} Alert!`,
      contents: flex,
      quickReply: quickReply['quickReply'] as QuickReply,
    };
  }
}
