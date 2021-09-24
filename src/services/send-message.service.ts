import { Inject, Injectable } from '@nestjs/common';
import { FlexMessage, Message } from '@line/bot-sdk';
import lineClient from '../configs/line.config';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { getConfig } from '../configs/config';
import * as quickReplyJson from '../constant-json/quick-reply/quick-reply-default.json';
import * as Types from '@line/bot-sdk/lib/types';
import { QuickReply } from '@line/bot-sdk/lib/types';
import { GenerateMessageService } from './generate-message.service';
import { FlexContainer } from '@line/bot-sdk/dist/types';

@Injectable()
export class SendMessageService {
  private readonly lineUserId;
  private readonly lineGroupId;
  private readonly env;

  constructor(
    private generateMessageService: GenerateMessageService,
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
    this.env = getConfig('NODE_ENV');
  }

  async sendReplyTextMessage(replyToken: string, message: string): Promise<any> {
    const msg = this.generateTextMessageObject(message);
    return await lineClient.replyMessage(replyToken, msg);
  }

  async sendReplyMessageObject(replyToken: string, message: Message[]): Promise<any> {
    return await lineClient.replyMessage(replyToken, message);
  }

  sendPushMessage(toId: string, message: string): any {
    const msg = this.generateTextMessageObject(message);
    lineClient.pushMessage(toId, msg);
  }

  async sendReplyFlexMessage(replyToken: string, altText: string, flex: FlexContainer, quickReply?: QuickReply): Promise<any> {
    const flexMsgObj = this.generateFlexMessageObject(altText, flex);
    return await lineClient.replyMessage(replyToken, flexMsgObj);
  }

  async sendStartServerMessage(): Promise<any> {
    const msg = `Trading Bot พร้อมใช้งานแล้ว! จาก \' + ${this.env}`;
    return await lineClient.pushMessage(this.lineUserId, this.generateTextMessageObject(msg));
  }

  async sendAlertSignalMessage(req: TradingViewReqDto): Promise<any> {
    const coin = req.symbol.replace('USDT', '');
    const flex = this.generateMessageService.generateAlertSignalFlexMsg({ ...req, symbol: coin });
    const altText = `${coin} ${req.side} Alert!`;
    const flexMessage = this.generateFlexMessageObject(altText, flex);
    return await lineClient.pushMessage(this.lineUserId, flexMessage);
  }

  async sendAlertCloseAndOpenNewPositionMessage(req: TradingViewReqDto): Promise<any> {
    const { symbol, side, openPrice } = req;
    const message = `เหรียญ: ${symbol}\n ${side} แล้ว ที่ราคา: ${openPrice}`;
    const textMessage = this.generateTextMessageObject(message);
    return await lineClient.pushMessage(this.lineUserId, textMessage);
  }

  async sendReplyMessage(replyToken: string, replyText: string, quickReply?: QuickReply): Promise<any> {
    const qpDefault = quickReplyJson['quickReply'] as QuickReply;
    let qp;
    if (quickReply === undefined) {
      qp = qpDefault;
    } else if (quickReply === null) {
      qp = null;
    } else {
      qp = quickReply;
    }
    const message = [
      {
        type: 'text',
        text: replyText,
        quickReply: qp,
      },
    ] as Types.Message[];

    await lineClient.replyMessage(replyToken, message);
  }

  generateTextMessageObject(replyText: string, quickReply?: QuickReply): Message[] {
    let qp = quickReplyJson['quickReply'] as QuickReply;
    if (quickReply) {
      qp = quickReply;
    }
    return [
      {
        type: 'text',
        text: replyText,
        quickReply: qp || null,
      },
    ] as Types.Message[];
  }

  generateFlexMessageObject(altText: string, flex: FlexContainer, quickReply?: QuickReply): FlexMessage {
    const qpDefault = quickReplyJson['quickReply'] as QuickReply;
    let qp;
    if (quickReply === undefined) {
      qp = qpDefault;
    } else if (quickReply === null) {
      qp = null;
    } else {
      qp = quickReply;
    }
    return {
      type: 'flex',
      altText: altText,
      contents: flex,
      quickReply: qp,
    };
  }
}
