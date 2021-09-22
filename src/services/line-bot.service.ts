import { Injectable } from '@nestjs/common';
import { FlexMessage, Message, MessageEvent, QuickReply } from '@line/bot-sdk';
import { getConfig } from '../configs/config';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { BinanceInfoService } from './binance-info.service';
import lineClient from '../configs/line.config';
import * as Types from '@line/bot-sdk/lib/types';
import * as quickReply from '../constant-json/quick-reply/quick-reply.json';
import * as flexMsg from '../constant-json/quick-reply/flex-message-football.json';
import {
  CURRENT_POSITION,
  CURRENT_POSITION_TEST, DEFAULT_MSG,
  FUTURE_BALANCE,
  SPOT_BALANCE, TRADING_SUMMARY,
} from '../constants/message.constant';
import { GenerateMessageService } from './generate-message.service';
import { OpeningPositionDto } from '../dto/opening-position.dto';
import { FlexContainer } from '@line/bot-sdk/dist/types';

@Injectable()
export class LineBotService {
  private readonly lineUserId;
  private readonly lineGroupId;
  private readonly env;

  constructor(
    private readonly binanceInfoService: BinanceInfoService,
    private readonly generateMessageService: GenerateMessageService,
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
    this.env = getConfig('NODE_ENV');

    lineClient.pushMessage(this.lineUserId, this.generateMessage('Trading Bot พร้อมใช้งานแล้ว! จาก ' + this.env));
  }

  async handleReplyMessage(events: any[]): Promise<any> {
    console.log('from line');
    console.log(events);
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
        // const resp = await this.binanceInfoService.getCurrentPosition();
        // replyText = this.generateMessageService.generateCurrentOpeningPositionMessage(resp);
        const resp = await this.binanceInfoService.getTestCurrentPosition();
        const flexMessage = await this.generateFlexCurrentPosition(resp);
        return lineClient.replyMessage(replyToken, flexMessage);
        // replyText = JSON.stringify(resp);
      } else if (message.text == CURRENT_POSITION_TEST) {
        const resp = await this.binanceInfoService.getTestCurrentPosition();
        replyText = this.generateMessageService.generateCurrentOpeningPositionMessage(resp);
      } else if (message.text == TRADING_SUMMARY) {
        const resp = await this.binanceInfoService.getTradingHistory();
        replyText = this.generateMessageService.generateSummaryTradingHistory(resp);
      }
    }
    const msg = this.generateMessage(replyText);
    return lineClient.replyMessage(replyToken, msg);
  }

  sendAlertSignalMessage(req: TradingViewReqDto): any {
    const flexMessage = this.generateFlexMessage(req);
    return lineClient.pushMessage(this.lineUserId, flexMessage);
  }

  sendAlertSignalMessage2(): any {
    const flexMessage = this.generateFlexMessage2();
    return lineClient.pushMessage(this.lineUserId, flexMessage);
  }

  sendAlertCloseAndOpenNewPositionMessage(req: TradingViewReqDto): any {
    const flexMessage = this.generateFlexMessage(req);
    const { symbol, side, openPrice } = req;
    const message = `เหรียญ: ${symbol}\n ${side} แล้ว ที่ราคา: ${openPrice}`;
    const textMessage = this.generateMessage(message);
    return lineClient.pushMessage(this.lineUserId, textMessage);
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

  async generateFlexCurrentPosition(req: OpeningPositionDto): Promise<FlexMessage> {
    const flex = await this.generateMessageService.generateFlexMsgCurrentPosition(req);
    return {
      type: 'flex',
      altText: `Current Position`,
      contents: flex,
      quickReply: quickReply['quickReply'] as QuickReply,
    };
  }

  generateFlexMessage2(): FlexMessage {
    const flex = flexMsg['default'] as FlexContainer;
    return {
      type: 'flex',
      altText: `Current Position`,
      contents: flex,
      quickReply: quickReply['quickReply'] as QuickReply,
    };
  }
}
