import { Inject, Injectable } from '@nestjs/common';
import { MessageEvent, PostbackEvent } from '@line/bot-sdk';
import {
  CLOSE_POSITION,
  CURRENT_POSITION,
  CURRENT_POSITION_TEST, DEFAULT_MSG,
  FUTURE_BALANCE,
  TRADING_SUMMARY,
} from '../constants/message.constant';
import { GenerateMessageService } from './generate-message.service';
import { EventTypeEnum } from '../enums/event-type.enum';
import { plainToClass } from 'class-transformer';
import { ActionPositionDto } from '../dto/action-position.dto';
import { ActionPositionEnum } from '../enums/action-position.enum';
import { TransactionRepository } from '../repositories/transaction.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceOrderService } from './binance-order.service';
import { SendMessageService } from './send-message.service';
import { getConfig } from '../configs/config';
import { validateTimeRange } from '../utils/utils';

@Injectable()
export class LineBotService {
  private readonly actionRangeTime;

  constructor(
    @Inject('BinanceOrderService')
    private binanceOrderService: BinanceOrderService,
    @Inject('GenerateMessageService')
    private generateMessageService: GenerateMessageService,
    @Inject('SendMessageService')
    private sendMessageService: SendMessageService,
    @InjectRepository(TransactionRepository)
    private transactionRepository: TransactionRepository,
  ) {
    this.sendMessageService.sendStartServerMessage();
    this.actionRangeTime = getConfig('ACTION_RANGE_TIME');
  }

  async handleReplyMessage(events: any[]): Promise<void> {
    await events.forEach(event => {
      if (event.type == EventTypeEnum.MESSAGE) {
        console.log('type message');
        this.handleTextMessage(event);
      } else if (event.type == EventTypeEnum.POSTBACK) {
        console.log('type postback');
        this.handlePostBackMessage(event);
      }
    });
  }

  async handleTextMessage(event: MessageEvent): Promise<any> {
    const { message, replyToken } = event;
    let replyText = DEFAULT_MSG;
    if (message.type == 'text') {
      if (message.text == CLOSE_POSITION) {
        const currentPosition = await this.binanceOrderService.getTestCurrentPosition();
        const flex = await this.generateMessageService.generateFlexMsgActionPosition(currentPosition);
        return await this.sendMessageService.sendReplyFlexMessage(replyToken, 'Take Profit Or Close Position', flex);

      } else if (message.text == FUTURE_BALANCE) {
        const resp = await this.binanceOrderService.getFutureBalance();
        replyText = JSON.stringify(resp);

      } else if (message.text == CURRENT_POSITION) {
        // const resp = await this.binanceOrderService.getCurrentPosition();
        // replyText = this.generateMessageService.generateCurrentOpeningPositionMessage(resp);
        const resp = await this.binanceOrderService.getTestCurrentPosition();
        const flex = await this.generateMessageService.generateFlexMsgCurrentPosition(resp);
        return await this.sendMessageService.sendReplyFlexMessage(replyToken, 'Current Position', flex);

      } else if (message.text == CURRENT_POSITION_TEST) {
        const resp = await this.binanceOrderService.getTestCurrentPosition();
        replyText = this.generateMessageService.generateCurrentOpeningPositionMessage(resp);

      } else if (message.text == TRADING_SUMMARY) {
        const resp = await this.binanceOrderService.getTradingHistory();
        replyText = this.generateMessageService.generateSummaryTradingHistory(resp);
      } else if (message.text.includes('#')) {
        return;
      }
    }
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
  }

  async handlePostBackMessage(event: PostbackEvent): Promise<any> {
    const { replyToken, postback } = event;
    const closePositionDto = plainToClass(ActionPositionDto, JSON.parse(postback.data));
    const { actionStatus, transactionId, markPrice, isConfirmed, actionTime } = closePositionDto;
    let replyText;
    if (!validateTimeRange(new Date(actionTime), +this.actionRangeTime)) {
      replyText = 'ไม่สามารถดำเนินการได้ เนื่องจาก token หมดอายุแล้ว กรุณาทำรายการใหม่อีกครั้ง';
      return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
    }

    if (actionStatus == ActionPositionEnum.CLOSE_POSITION) {
      if (!isConfirmed && isConfirmed != false) {
        replyText = this.generateMessageService.generateMsgAskToConfirm(closePositionDto);
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmTransaction(closePositionDto);
        return await this.sendMessageService.sendReplyMessage(replyToken, replyText, quickReply);
      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('confirm transaction to close position!');
        const resp = await this.binanceOrderService.closePositionByTransactionId(transactionId, markPrice);
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(resp);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition);
        return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject]);

      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('confirm transaction to not close position!');
        replyText = 'ยกเลิกคำสั่ง close position แล้ว';

      } else {
        console.log('nothing!!');
        replyText = DEFAULT_MSG;
      }

    } else if (actionStatus == ActionPositionEnum.TAKE_PROFIT) {
      // take profit function

    } else if (actionStatus == ActionPositionEnum.SWAP_POSITION) {
      // swap position is sell current position and buy opposite position immediately
      if (!isConfirmed && isConfirmed != false) {
        console.log('Swap Position: Ask to confirm to action transaction');
        replyText = this.generateMessageService.generateMsgAskToConfirm(closePositionDto);
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmTransaction(closePositionDto);
        return await this.sendMessageService.sendReplyMessage(replyToken, replyText, quickReply);

      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('Swap Position: Swap Position Confirmed');
        const resp = await this.binanceOrderService.swapPositionByTransactionId(transactionId, markPrice);
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(resp.closedPosition);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition, null);
        const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(resp.buyPosition);
        const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
        return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject, flexBuyObject]);

      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('Swap Position: Swap Position No Confirmed');
        replyText = 'ยกเลิกคำสั่ง swap position แล้ว';

      } else {
        console.log('nothing!!');
        replyText = DEFAULT_MSG;
      }
    } else {
      // nothing
    }
    console.log('send message complete transaction');
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
  }

}
