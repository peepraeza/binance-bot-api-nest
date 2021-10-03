import { Inject, Injectable } from '@nestjs/common';
import { MessageEvent, PostbackEvent } from '@line/bot-sdk';
import {
  CLOSE_POSITION,
  CURRENT_POSITION,
  CURRENT_POSITION_TEST,
  DEFAULT_MSG,
  FUTURE_BALANCE,
  MSG_CANCEL_ORDER,
  MSG_ERR_CANNOT_TAKE_PROFIT,
  MSG_ERR_TOKEN_EXPIRED,
  MSG_NO_DATA,
  MSG_NO_POSITION_OPENING,
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
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';
import { PostbackTypeDto } from '../dto/postback-type.dto';
import { PostbackTypeEnum } from '../enums/postback-type.enum';
import { ClosedPositionDto } from '../dto/closed-position.dto';

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
    @Inject('UserService')
    private userService: UserService,
    @InjectRepository(TransactionRepository)
    private transactionRepository: TransactionRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
  ) {
    this.sendMessageService.sendStartServerMessage();
    this.actionRangeTime = getConfig('ACTION_RANGE_TIME');
  }

  async handleReplyMessage(events: any[]): Promise<void> {
    for (const event of events) {
      const lineUserId = event.source.userId;
      const user = await this.userRepository.findUserByLineUserId(lineUserId);
      if (!user) {
        if (event.type == EventTypeEnum.MESSAGE) {
          return await this.handleRegisterLineBot(event);
        } else if (event.type == EventTypeEnum.POSTBACK) {
          await this.handlePostBackRegister(event);
        }
      } else {
        if (user.binanceData) {
          if (event.type == EventTypeEnum.MESSAGE) {
            console.log('type message');
            await this.handleTextMessage(event);
          } else if (event.type == EventTypeEnum.POSTBACK) {
            console.log('type postback');
            await this.handlePostBackMessage(event);
          }
        } else {
          await this.handleFillBinanceData(event);
        }

      }

    }
  }

  async handleTextMessage(event: MessageEvent): Promise<any> {
    const { message, replyToken, source } = event;
    let replyText = DEFAULT_MSG;
    if (message.type == 'text') {
      if (message.text == CLOSE_POSITION) {
        console.log('action position');
        const currentPosition = await this.binanceOrderService.getCurrentPosition(source.userId);
        if (currentPosition.position.length > 0) {
          const flexTemplateMsgActionPosition = await this.generateMessageService.generateFlexMsgActionPosition(currentPosition);
          const flexObject = this.sendMessageService.generateFlexMessageObject('Action Position', flexTemplateMsgActionPosition);
          return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexObject]);
        } else {
          replyText = MSG_NO_POSITION_OPENING;
        }
      } else if (message.text == FUTURE_BALANCE) {
        const resp = await this.binanceOrderService.getFutureBalance();
        replyText = JSON.stringify(resp);

      } else if (message.text == CURRENT_POSITION) {
        const resp = await this.binanceOrderService.getCurrentPosition(source.userId);
        if (resp.position.length > 0) {
          const flex = await this.generateMessageService.generateFlexMsgCurrentPosition(resp);
          return await this.sendMessageService.sendReplyFlexMessage(replyToken, 'Current Position', flex);
        } else {
          replyText = MSG_NO_POSITION_OPENING;
        }
      } else if (message.text == CURRENT_POSITION_TEST) {
        const resp = await this.binanceOrderService.getCurrentPosition(source.userId);
        if (resp.position.length > 0) {
          replyText = this.generateMessageService.generateCurrentOpeningPositionMessage(resp);
        } else {
          replyText = MSG_NO_POSITION_OPENING;
        }
      } else if (message.text == TRADING_SUMMARY) {
        const resp = await this.binanceOrderService.getTradingHistory();
        if (resp.length > 0) {
          replyText = this.generateMessageService.generateSummaryTradingHistory(resp);
        } else {
          replyText = MSG_NO_DATA;
        }
      } else if (message.text.includes('#')) {
        return;
      }
    }
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
  }

  async handlePostBackMessage(event: PostbackEvent): Promise<any> {
    const postBackData = JSON.parse(event.postback.data);
    const postbackInfo = plainToClass(PostbackTypeDto, postBackData);
    if (postbackInfo.type == PostbackTypeEnum.ACTION_POSITION) {
      const actionPosition = plainToClass(ActionPositionDto, postbackInfo.data);
      await this.actionPosition(actionPosition, event);
    } else if (postbackInfo.type == PostbackTypeEnum.VIEW_CLOSE_POSITION) {
      const closedPositionDto = plainToClass(ClosedPositionDto, postbackInfo.data);
      await this.viewClosedPositionDetail(closedPositionDto.transactionId, event);
    }
  }

  async actionPosition(actionPosition: ActionPositionDto, event: PostbackEvent): Promise<any> {
    const { replyToken, source } = event;
    const { actionStatus, transactionId, isConfirmed, actionTime } = actionPosition;
    let replyText;
    if (!validateTimeRange(new Date(actionTime), +this.actionRangeTime)) {
      replyText = MSG_ERR_TOKEN_EXPIRED;
      return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText);
    }

    if (actionStatus == ActionPositionEnum.CLOSE_POSITION) {
      console.log('user click close position');
      if (!isConfirmed && isConfirmed != false) {
        replyText = this.generateMessageService.generateMsgAskToConfirm(actionPosition);
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmTransaction(actionPosition);
        return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText, quickReply);
      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('confirm transaction to close position!');
        const resp = await this.binanceOrderService.closePositionByTransactionId(transactionId);
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(resp);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition);
        return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject]);

      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('confirm transaction to not close position!');
        replyText = MSG_CANCEL_ORDER;

      } else {
        console.log('nothing!!');
        replyText = DEFAULT_MSG;
      }
    } else if (actionStatus == ActionPositionEnum.TAKE_PROFIT) {
      console.log('user click take profit');
      // take profit function
      if (!isConfirmed && isConfirmed != false) {
        console.log('Take Profit: Ask to confirm to action transaction');
        replyText = this.generateMessageService.generateMsgAskToConfirm(actionPosition);
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmTransaction(actionPosition);
        return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText, quickReply);

      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('Take Profit: Take Profit Confirmed');
        const resp = await this.binanceOrderService.takeProfitByTransactionId(transactionId);
        if (resp) {
          const flexTemplateTakeProfit = this.generateMessageService.generateFlexMsgTakeProfit(resp);
          const flexTakeProfitObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateTakeProfit);
          return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexTakeProfitObject]);
        } else {
          replyText = MSG_ERR_CANNOT_TAKE_PROFIT;
        }
      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('Swap Position: Swap Position No Confirmed');
        replyText = MSG_CANCEL_ORDER;

      } else {
        console.log('nothing!!');
        replyText = DEFAULT_MSG;
      }
    } else if (actionStatus == ActionPositionEnum.SWAP_POSITION) {
      console.log('user click swap position');
      // swap position is sell current position and buy opposite position immediately
      if (!isConfirmed && isConfirmed != false) {
        console.log('Swap Position: Ask to confirm to action transaction');
        replyText = this.generateMessageService.generateMsgAskToConfirm(actionPosition);
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmTransaction(actionPosition);
        return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText, quickReply);

      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('Swap Position: Swap Position Confirmed');
        const resp = await this.binanceOrderService.swapPositionByTransactionId(transactionId);
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(resp.closedPosition);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition, null);
        const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(resp.buyPosition);
        const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
        return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject, flexBuyObject]);

      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('Swap Position: Swap Position No Confirmed');
        replyText = MSG_CANCEL_ORDER;

      } else {
        console.log('nothing!!');
        replyText = DEFAULT_MSG;
      }
    } else if (actionStatus == ActionPositionEnum.CLOSE_ALL_POSITION) {
      console.log('user click close all position');
      // swap position is sell current position and buy opposite position immediately
      if (!isConfirmed && isConfirmed != false) {
        console.log('Close All Position: Ask to confirm to action transaction');
        replyText = this.generateMessageService.generateMsgAskToConfirmCloseAllPosition();
        const quickReply = this.generateMessageService.generateQuickReplyAskConfirmClosePosition(actionPosition);
        return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText, quickReply);

      } else if (isConfirmed != null && isConfirmed === true) {
        console.log('Close All Position: Close All Position Confirmed');
        const resp = await this.binanceOrderService.closeAllCurrentPosition(source.userId);
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedAllPosition(resp);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition, null);
        return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject]);

      } else if (isConfirmed != null && isConfirmed === false) {
        console.log('Close All Position: Close All Position Not Confirmed');
        replyText = MSG_CANCEL_ORDER;

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

  async viewClosedPositionDetail(transactionId: number, event: PostbackEvent): Promise<any> {
    const { replyToken } = event;
    console.log('confirm transaction to close position!');
    const resp = await this.binanceOrderService.getClosedPositionDetail(transactionId);
    const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(resp);
    const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition);
    return await this.sendMessageService.sendReplyMessageObject(replyToken, [flexClosedObject]);
  }

  async handleRegisterLineBot(event: MessageEvent): Promise<any> {
    const { replyToken, source } = event;
    const replyText = `คุณยังไม่ลงทะเบียน line bot crypto trading คลิกด้านล่างเพื่อลงทะเบียน`;
    const quickReply = this.generateMessageService.generateQuickReplyRegisterLineUser(source.userId);
    return await this.sendMessageService.sendReplyTextMessage(replyToken, replyText, quickReply);
  }

  async handlePostBackRegister(event: PostbackEvent): Promise<any> {
    const { postback, replyToken } = event;
    const jsonData = JSON.parse(postback.data);
    await this.userService.createUser(jsonData['lineUserId']);
    return await this.sendMessageService.sendReplyTextMessage(replyToken, 'ลงทะเบียนเรียบร้อยแล้ว');
  }

  async handleFillBinanceData(event: MessageEvent): Promise<any> {
    const { source, replyToken } = event;
    const quickReploy = this.generateMessageService.generateQuickReplyRegisterURL(source.userId);
    return await this.sendMessageService.sendReplyTextMessage(replyToken, 'กรอก binance Data', quickReploy);
  }
}

