import { Injectable } from '@nestjs/common';
import { FlexMessage, Message } from '@line/bot-sdk';
import lineClient from '../configs/line.config';
import { getConfig } from '../configs/config';
import * as quickReplyJson from '../constant-json/quick-reply/quick-reply-default.json';
import * as Types from '@line/bot-sdk/lib/types';
import { QuickReply } from '@line/bot-sdk/lib/types';
import { FlexContainer } from '@line/bot-sdk/dist/types';

@Injectable()
export class SendMessageService {
  private readonly lineUserId;
  private readonly lineGroupId;
  private readonly env;

  constructor() {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
    this.env = getConfig('NODE_ENV');
  }

  async sendReplyMessageObject(replyToken: string, message: Message[]): Promise<any> {
    return await lineClient.replyMessage(replyToken, message);
  }

  async sendPushMessageObject(userId: string, message: Message[]): Promise<any> {
    return await lineClient.pushMessage(userId, message);
  }

  async sendReplyTextMessage(replyToken: string, replyText: string, quickReply?: QuickReply): Promise<any> {
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

    return await this.sendReplyMessageObject(replyToken, message);
  }

  async sendPushTextMessage(replyToken: string, replyText: string, quickReply?: QuickReply): Promise<any> {
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

    return await this.sendReplyMessageObject(replyToken, message);
  }

  async sendReplyFlexMessage(replyToken: string, altText: string, flex: FlexContainer, quickReply?: QuickReply): Promise<any> {
    const flexMsgObj = this.generateFlexMessageObject(altText, flex);
    return await lineClient.replyMessage(replyToken, flexMsgObj);
  }

  async sendStartServerMessage(): Promise<any> {
    const msg = `Trading Bot พร้อมใช้งานแล้ว! จาก ${this.env}`;
    return await lineClient.pushMessage(this.lineUserId, this.generateTextMessageObject(msg));
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
