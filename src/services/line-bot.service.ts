import { Inject, Injectable } from '@nestjs/common';
import { MessageEvent, PostbackEvent } from '@line/bot-sdk';
import {
  CLOSE_POSITION,
  CURRENT_POSITION,
  CURRENT_POSITION_TEST, DEFAULT_MSG,
  FUTURE_BALANCE,
  SPOT_BALANCE, TRADING_SUMMARY,
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

@Injectable()
export class LineBotService {

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

  }

  async handleReplyMessage(events: any[]): Promise<void> {
    console.log('from line');
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
        const flex = await this.generateMessageService.generateFlexMsgTakePFAndClosePS(currentPosition);
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
      }
    }
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
  }

  async handlePostBackMessage(event: PostbackEvent): Promise<any> {
    const { replyToken, postback } = event;
    const closePositionDto = plainToClass(ActionPositionDto, JSON.parse(postback.data));
    console.log(closePositionDto);
    let replyText;
    if (closePositionDto.actionStatus == ActionPositionEnum.CLOSE_POSITION) {
      const resp = await this.binanceOrderService.closePositionByTransactionId(+closePositionDto.transactionId, +closePositionDto.markPrice);

      replyText = this.generateMessageService.generateClosedPositionMsg(resp);
    } else {
      // take profit function
    }
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
  }

}
