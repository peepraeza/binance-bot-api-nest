import { Inject, Injectable } from '@nestjs/common';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { PositionSideEnum } from '../enums/position-side.enum';
import { TransactionRepository } from '../repositories/transaction.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { countDecimals, dateToString, duration } from '../utils/utils';
import binance from '../configs/binance.config';
import { SideEnum } from '../enums/side.enum';
import * as minNotional from '../constant-json/minNotional.json';
import { AppConfigRepository } from '../repositories/appconfig.repository';
import { ProfitLossHistoryRepository } from '../repositories/profit-loss-history.repository';
import { ProfitLossHistory } from '../entities/profit-loss-history.entity';
import { ClosedPositionDto } from '../dto/closed-position.dto';
import { OpeningPositionDataDto, OpeningPositionDto } from '../dto/opening-position.dto';
import { TradingHistoryDto } from '../dto/trading-history.dto';
import { plainToClass } from 'class-transformer';
import { YYYY_MM_DD } from '../constants/constants';
import { SendMessageService } from './send-message.service';
import { GenerateMessageService } from './generate-message.service';
import { BuyPositionDto } from '../dto/buy-position.dto';
import { SwapPositionDto } from '../dto/swap-position.dto';
import { OrderInfoDto } from '../dto/order-info.dto';
import { getConfig } from '../configs/config';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { UserSymbolMappingRepository } from '../repositories/user-symbol-mapping.repository';
import { decrypt } from '../middlewares/cryptojs.middleware';

@Injectable()
export class BinanceOrderService {
  private readonly positionMapping = { 'BUY': PositionSideEnum.BUY, 'SELL': PositionSideEnum.SELL };
  private readonly lineUserId;
  private readonly lineGroupId;

  constructor(
    @Inject('SendMessageService')
    private sendMessageService: SendMessageService,
    @Inject('GenerateMessageService')
    private generateMessageService: GenerateMessageService,
    @InjectRepository(TransactionRepository)
    private transactionRepository: TransactionRepository,
    @InjectRepository(ProfitLossHistoryRepository)
    private profitLossHistoryRepository: ProfitLossHistoryRepository,
    @InjectRepository(AppConfigRepository)
    private appConfigRepository: AppConfigRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(UserSymbolMappingRepository)
    private userSymbolMappingRepository: UserSymbolMappingRepository,
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
  }

  //buy long or short position follow by signal from trading view
  async actionPosition(reqDto: TradingViewReqDto): Promise<void> {
    console.log('from trading view');
    const { symbol, side } = reqDto;
    const positionSide = this.positionMapping[side.toUpperCase()];
    // find user that select this coin
    const coin = symbol.replace('USDT', '');
    const userSelected = await this.userRepository.findUserByCoinSelected(coin);
    if (userSelected.length == 0) {
      console.log('no user select this coin');
      return;
    }
    for (const user of userSelected) {
      // validate signal has already opening
      console.log(user.binanceData);
      const key = decrypt(user.binanceData, user.lineUserId + '|' + 'pee');
      console.log(key);
      const currentPosition = await this.transactionRepository.findOpeningPositionBySymbolAndUser(symbol, user.userId);
      // todo: you have to change this logic to > user.isReadyToTrade == true / when you ready to use this app
      if (user.isReadyToTrade == false && userSelected.length > 0) {
        let isReady = true;
        if (!user.isReadyToTrade) isReady = false;
        if (currentPosition) {
          if (currentPosition.positionSide == positionSide) {
            // send message : already opening
            await this.sendMessageService.sendPushTextMessage(user.lineUserId, 'มี position นี้เปิดอยู่แล้ว');
          } else {
            // close current position and buy new position
            const closePosition = await this.closeCurrentPosition(currentPosition, isReady);
            const openPosition = await this.buyNewPosition(user.userId, symbol, side, isReady);

            // send message : order already buy
            const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(closePosition);
            const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition, null);
            const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(openPosition);
            const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
            await this.sendMessageService.sendPushMessageObject(user.lineUserId, [flexClosedObject, flexBuyObject]);
          }
        } else {
          // buy new position save database
          const openPosition = await this.buyNewPosition(user.userId, symbol, side, isReady);
          const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(openPosition);
          const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
          await this.sendMessageService.sendPushMessageObject(user.lineUserId, [flexBuyObject]);
          // send message : order already buy
        }
      } else {
        const replyText = `มี signal เหรียญ ${reqDto.symbol} ที่คุณลงทะเบียนไว้ ให้ ${reqDto.side} แต่เหมือนว่าคุณยังไม่พร้อมเทรดนะ`;
        await this.sendMessageService.sendPushTextMessage(user.lineUserId, replyText);
      }
    }
  }

  async buyNewPosition(userId: number, symbol: string, side: string, isReady = true): Promise<BuyPositionDto> {
    // open binance position
    try {
      console.log('Call function buy new position');
      const coin = symbol.replace('USDT', '');
      const resp = await Promise.all([
        this.userSymbolMappingRepository.findSymbolInfoByUserIdAndSymbol(userId, coin),
        binance.futures.markPrice(symbol),
      ]);

      const symbolInfo = resp[0];
      const limitPrice = symbolInfo.limitPrice;
      const leverage = symbolInfo.leverage;
      const priceObject = resp[1];
      const openPrice = priceObject['markPrice'];
      const quantity = this.calQuantity(symbol, limitPrice, leverage, openPrice);
      console.log('quantity: ' + quantity);

      let orderOpened, order, quantityBuy, orderId, buyCost, buyPrice;
      if (isReady) {
        if (side == SideEnum.BUY) {
          orderOpened = await binance.futures.marketBuy(symbol, quantity);
        } else {
          orderOpened = await binance.futures.marketSell(symbol, quantity);
        }
        order = await binance.futures.orderStatus(symbol, { orderId: orderOpened['orderId'] });

        quantityBuy = +order.origQty;
        orderId = order.orderId;
        buyCost = +order.cumQuote;
        buyPrice = +order.avgPrice;

      } else {
        quantityBuy = quantity;
        orderId = 1;
        buyCost = '' + (quantity * openPrice).toFixed(2);
        buyPrice = '' + (+openPrice).toFixed(4);
      }
      // save transaction to db
      // const orderInfo = plainToClass(OrderInfoDto, order);
      const todayDate = dateToString(new Date());

      const transaction = new Transaction();
      transaction.positionSide = this.positionMapping[side];
      transaction.symbol = symbol;
      transaction.isTrading = true;
      transaction.userId = userId;
      transaction.buyQuantity = quantityBuy;
      transaction.leverage = leverage;
      transaction.buyOrderId = orderId;
      transaction.buyCost = buyCost;
      transaction.buyPrice = buyPrice;
      transaction.buyDate = todayDate;
      transaction.updatedAt = todayDate;
      await this.transactionRepository.save(transaction);
      console.log('BuyNewPosition Success and save transaction to database');
      // return data from binance
      return {
        symbol: symbol,
        positionSide: this.positionMapping[side],
        quantity: quantity,
        buyPrice: buyPrice,
        buyDate: todayDate,
        buyCost: buyCost,
      };
    } catch (e) {
      console.log('error from: ' + e);
    }
  }

  async closeCurrentPosition(currentPosition: Transaction, isReady = true): Promise<ClosedPositionDto> {
    try {
      console.log('Call function closeCurrentPosition');

      // close binance position
      const { symbol, buyQuantity, buyPrice, buyCost, positionSide, buyDate, transactionId } = currentPosition;
      let orderClose, order, sellCost, closePrice, orderId;
      if (isReady) {
        if (positionSide == 'LONG') {
          orderClose = await binance.futures.marketSell(symbol, buyQuantity, {
            reduceOnly: true,
          });
        } else {
          orderClose = await binance.futures.marketBuy(symbol, buyQuantity, {
            reduceOnly: true,
          });
        }
        order = plainToClass(OrderInfoDto,
          await binance.futures.orderStatus(symbol, { orderId: orderClose['orderId'] }));

        sellCost = +order.cumQuote;
        closePrice = +order.avgPrice;
        orderId = order.orderId;
      } else {
        orderClose = await binance.futures.markPrice(symbol);
        sellCost = '' + (buyQuantity * orderClose['markPrice']).toFixed(4);
        closePrice = '' + (+orderClose['markPrice']).toFixed(4);
        orderId = 1;
      }

      // save transaction to database
      const todayDate = dateToString(new Date());
      currentPosition.isTrading = false;
      currentPosition.sellOrderId = orderId;
      currentPosition.sellCost = sellCost;
      currentPosition.sellDate = todayDate;
      currentPosition.sellPrice = closePrice;
      currentPosition.sellQuantity = buyQuantity;
      currentPosition.updatedAt = todayDate;
      await this.transactionRepository.save(currentPosition);

      const profitLossHistory = new ProfitLossHistory();
      const profit = this.calProfitLoss(buyCost, sellCost, positionSide);
      const profitPercent = this.calProfitLossPercentage(buyPrice, closePrice, positionSide);
      const buyDuration = duration(new Date(buyDate), new Date());
      const resultStatus = profitPercent > 0 ? 'W' : 'L';
      profitLossHistory.transactionId = transactionId;
      profitLossHistory.pl = profit;
      profitLossHistory.plPercentage = profitPercent;
      profitLossHistory.duration = buyDuration;
      profitLossHistory.resultStatus = resultStatus;
      profitLossHistory.sellDate = todayDate;
      await this.profitLossHistoryRepository.save(profitLossHistory);
      console.log('Close position success and save transaction history to database.');

      // return data from binance
      return {
        symbol: symbol,
        positionSide: positionSide,
        buyPrice: buyPrice,
        closedPrice: closePrice,
        closedTime: todayDate,
        quantity: buyQuantity,
        plPercentage: profitPercent,
        pl: profit,
        resultStatus: resultStatus,
        duration: buyDuration,
      };
    } catch (e) {
      console.log('error from: ' + e);
    }
  }

  async takeProfitPosition(currentPosition: Transaction, quantityTp: number, isReady = true): Promise<ClosedPositionDto> {
    console.log('Call function takeProfitPosition');
    // close binance position
    const {
      symbol,
      buyPrice,
      buyQuantity,
      positionSide,
      buyDate,
      transactionId,
      userId,
      leverage,
      buyCost,
    } = currentPosition;

    let order, orderInfo, sellCost, closePrice, orderId, orderClose, profit;
    if (isReady) {
      if (positionSide == 'LONG') {
        order = await binance.futures.marketSell(symbol, quantityTp, {
          reduceOnly: true,
        });
      } else {
        order = await binance.futures.marketBuy(symbol, quantityTp, {
          reduceOnly: true,
        });
      }
      orderInfo = plainToClass(OrderInfoDto,
        await binance.futures.orderStatus(symbol, { orderId: order['orderId'] }));

      sellCost = +orderInfo.cumQuote;
      closePrice = +orderInfo.avgPrice;
      orderId = orderInfo.orderId;
      profit = +orderInfo.cumQuote;
    } else {
      orderClose = await binance.futures.markPrice(symbol);
      sellCost = '' + (quantityTp * orderClose['markPrice']).toFixed(4);
      console.log('sellCost: ', sellCost);
      closePrice = '' + (+orderClose['markPrice']).toFixed(4);
      orderId = 1;
      profit = sellCost;
    }

    // save transaction to database
    const todayDate = dateToString(new Date());
    currentPosition.isTrading = false;
    currentPosition.sellOrderId = orderId;
    currentPosition.sellCost = sellCost;
    currentPosition.sellQuantity = quantityTp;
    currentPosition.sellDate = todayDate;
    currentPosition.sellPrice = closePrice;
    currentPosition.updatedAt = todayDate;
    await this.transactionRepository.save(currentPosition);

    // create new transaction
    const transaction = new Transaction();
    transaction.positionSide = positionSide;
    transaction.buyQuantity = buyQuantity - quantityTp;
    transaction.isTrading = true;
    transaction.buyDate = todayDate;
    transaction.symbol = symbol;
    transaction.buyPrice = closePrice;
    transaction.updatedAt = todayDate;
    transaction.userId = userId;
    transaction.leverage = leverage;
    transaction.buyOrderId = orderId;
    transaction.buyCost = closePrice * (buyQuantity - quantityTp);

    await this.transactionRepository.save(transaction);
    console.log('BuyNewPosition Success and save transaction to database');

    const profitLossHistory = new ProfitLossHistory();
    const profitPercent = this.calProfitLossPercentage(buyPrice, closePrice, positionSide);
    // const profitPercent = this.calProfitLoss(buyPrice, closePrice, positionSide);
    const buyDuration = duration(new Date(buyDate), new Date());
    const resultStatus = profitPercent > 0 ? 'W' : 'L';
    profitLossHistory.transactionId = transactionId;
    profitLossHistory.pl = profit;
    profitLossHistory.plPercentage = profitPercent;
    profitLossHistory.duration = buyDuration;
    profitLossHistory.resultStatus = resultStatus;
    profitLossHistory.sellDate = todayDate;
    await this.profitLossHistoryRepository.save(profitLossHistory);
    console.log('Close position success and save transaction history to database.');

    // return data from binance
    return {
      symbol: symbol,
      positionSide: positionSide,
      buyPrice: buyPrice,
      closedPrice: closePrice,
      closedTime: todayDate,
      quantity: quantityTp,
      plPercentage: profitPercent,
      pl: profit,
      resultStatus: resultStatus,
      duration: buyDuration,
    };
  }

  async getSpotBalance(): Promise<object> {
    const balance = await binance.spot.balance();
    console.log(balance);
    return balance;
  }

  async getFutureBalance(): Promise<object> {
    const balance = await binance.futures.balance();
    console.log(balance);
    return balance;
  }

  async getCurrentPosition(): Promise<OpeningPositionDto> {
    const resp = await Promise.all([
      this.transactionRepository.findAllOpeningPosition(),
      await binance.futures.prices(),
    ]);
    const currentPosition: Transaction[] = resp[0];
    // const leverage = await this.appConfigRepository.getValueNumber('binance.future_leverage');
    const currentPrices = resp[1];
    const updatedAt = dateToString(new Date());
    const openingPositionDataDto: OpeningPositionDataDto[] = [];
    for (const position of currentPosition) {
      const positions = new OpeningPositionDataDto();
      const currentPrice = +currentPrices[position.symbol];
      const entryPrice = position.buyPrice;
      const unrealizedProfit = position.buyQuantity * currentPrice;
      positions.transactionId = position.transactionId;
      positions.symbol = position.symbol;
      positions.positionSide = position.positionSide;
      positions.quantity = position.buyQuantity;
      positions.profitLoss = this.calProfitLoss(position.buyCost, unrealizedProfit, position.positionSide);
      positions.entryPrice = entryPrice;
      positions.markPrice = currentPrice;
      positions.profitLossPercentage = this.calProfitLossPercentage(entryPrice, currentPrice, position.positionSide);
      positions.duration = duration(new Date(position.buyDate), new Date(updatedAt));
      openingPositionDataDto.push(positions);
    }
    return {
      updateTime: updatedAt,
      position: openingPositionDataDto,
    };
  }

  async getTradingHistory(): Promise<TradingHistoryDto[]> {
    const tradingHistoryDto = plainToClass(TradingHistoryDto, await this.profitLossHistoryRepository.findSummaryTradingHistory());
    return tradingHistoryDto.map(trading => {
      trading.sellDate = dateToString(new Date(trading.sellDate), YYYY_MM_DD);
      const avg = '' + trading.avg.toFixed(2);
      trading.avg = +avg;
      trading.win = +trading.win;
      trading.loss = +trading.loss;
      trading.total = +trading.total;
      return trading;
    });
  }

  async closePositionByTransactionId(transactionId: number): Promise<ClosedPositionDto> {
    console.log('closePositionByTransactionId');
    const currentPosition = await this.transactionRepository.findOne(transactionId);
    let isReady = true;
    if (currentPosition.buyOrderId == 1) isReady = false;
    return await this.closeCurrentPosition(currentPosition, isReady);
  }

  async swapPositionByTransactionId(transactionId: number): Promise<SwapPositionDto> {
    console.log('Swap Position: Call function to close current position and buy new one.');
    const currentPosition = await this.transactionRepository.findOne(transactionId);
    let isReady = true;
    const { symbol, positionSide, buyOrderId } = currentPosition;
    if (buyOrderId == 1) isReady = false;
    const closedPosition = await this.closeCurrentPosition(currentPosition, isReady);
    const side = positionSide == 'LONG' ? SideEnum.SELL : SideEnum.BUY;
    const buyNewPosition = await this.buyNewPosition(currentPosition.userId, symbol, side, isReady);
    return {
      symbol,
      closedPosition: closedPosition,
      buyPosition: buyNewPosition,
    };
  }

  async takeProfitByTransactionId(transactionId: number): Promise<ClosedPositionDto> {
    console.log('Take Profit: Calculate profit from cost and unrealized profit');

    const currentPosition = await this.transactionRepository.findOne(transactionId);
    const { buyQuantity, buyPrice, symbol, leverage, buyOrderId, positionSide } = currentPosition;
    let isReady = true;
    const priceObject = await binance.futures.markPrice(symbol);
    const markPrice = priceObject['markPrice'];
    const unrealizedCost = buyQuantity * markPrice;
    const cost = buyQuantity * buyPrice;

    const profit = this.calProfitLoss(cost, unrealizedCost, positionSide);
    if (profit <= 0) return;
    const quantityTP = this.calQuantity(symbol, profit, leverage, markPrice);
    console.log('quantity for take profit: ', quantityTP);
    console.log('profit: ', profit);
    if (buyQuantity <= 0) return;
    if (buyOrderId == 1) isReady = false;
    return await this.takeProfitPosition(currentPosition, quantityTP, isReady);
  }

  calQuantity(symbol: string, limitPrice: number, leverage: number, markPrice: number): number {
    console.log('Calculate Quantity');
    // get current price of that coin
    const betPrice = limitPrice * leverage;
    const currentPrice = markPrice;
    let quantity = betPrice / currentPrice;
    const minQuantity = +minNotional[symbol].minQty;
    const minPrice = minQuantity * currentPrice;
    if (minPrice > betPrice) {
      console.log(`buy price: (${betPrice}) less than minimum price: ${minPrice}`);
      return 0;
    }
    const countDecimal = countDecimals(minQuantity);
    if (countDecimal > 0) {
      quantity = +quantity.toFixed(countDecimal);
    } else {
      quantity = Math.floor(quantity);
    }
    return quantity;
  }

  calProfitLossPercentage(buyCost: number, sellCost: number, positionSide?: string): number {
    console.log('calculate ProfitLossPercentage');
    let percentage;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      percentage = ((buyCost - sellCost) / sellCost) * 100;
    } else {
      percentage = ((sellCost - buyCost) / buyCost) * 100;
    }
    return +percentage.toFixed(2);
  }

  calProfitLoss(buyCost: number, sellCost: number, positionSide?: string): number {
    console.log('calculate ProfitLoss');
    let profit;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      profit = (buyCost - sellCost);
    } else {
      profit = (sellCost - buyCost);
    }
    const profitString = '' + profit.toFixed(2);
    console.log('profitString: ', profitString);
    return +profitString;
  }

}
