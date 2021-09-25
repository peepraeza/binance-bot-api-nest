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
  ) {
    this.lineUserId = getConfig('LINE_USER_ID');
    this.lineGroupId = getConfig('LINE_GROUP_ID');
  }

  //buy long or short position follow by signal from trading view
  async actionPosition(reqDto: TradingViewReqDto): Promise<void> {
    console.log('from trading view');
    const { symbol, side } = reqDto;
    const positionSide = this.positionMapping[side.toUpperCase()];

    // validate signal has already opening
    const currentPosition = await this.transactionRepository.findOpeningPositionBySymbolAndSide(symbol);
    if (currentPosition) {
      if (currentPosition.positionSide == positionSide) {
        // send message : already opening
        return await this.sendMessageService.sendPushTextMessage(this.lineUserId, 'มี position นี้เปิดอยู่แล้ว')
      } else {
        // close current position and buy new position
        const closePosition = await this.closeCurrentPosition(currentPosition);
        const openPosition = await this.buyNewPosition(symbol, side);

        // send message : order already buy
        const flexTemplateClosedPosition = this.generateMessageService.generateFlexMsgClosedPosition(closePosition);
        const flexClosedObject = this.sendMessageService.generateFlexMessageObject('Close Position', flexTemplateClosedPosition, null);
        const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(openPosition);
        const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
        return await this.sendMessageService.sendPushMessageObject(this.lineUserId, [flexClosedObject, flexBuyObject]);
      }
    } else {
      // buy new position save database
      const openPosition = await this.buyNewPosition(symbol, side);
      const flexTemplateBuyPosition = this.generateMessageService.generateFlexMsgBuyPosition(openPosition);
      const flexBuyObject = this.sendMessageService.generateFlexMessageObject('Buy Position', flexTemplateBuyPosition);
      return await this.sendMessageService.sendPushMessageObject(this.lineUserId, [flexBuyObject]);
      // send message : order already buy
    }
  }

  async buyNewPosition(symbol: string, side: string): Promise<BuyPositionDto> {
    // open binance position
    try {
      console.log('Call function buy new position');
      const resp = await Promise.all([
        this.appConfigRepository.getValueNumber('binance.limit_price'),
        this.appConfigRepository.getValueNumber('binance.future_leverage'),
        binance.futures.markPrice(symbol),
      ]);

      // const resp = await binance.futures.leverage(symbol, leverage);
      // await binance.futures.marginType(symbol, 'ISOLATED');
      const limitPrice = resp[0];
      const leverage = resp[1];
      const priceObject = resp[2];
      const openPrice = priceObject['markPrice'];
      const quantity = this.calQuantity(symbol, limitPrice, leverage, openPrice);
      console.log('quantity: ' + quantity);

      let orderOpened;
      if (side == SideEnum.BUY) {
        orderOpened = await binance.futures.marketBuy(symbol, quantity);
      } else {
        orderOpened = await binance.futures.marketSell(symbol, quantity);
      }
      const order = await binance.futures.orderStatus(symbol, { orderId: orderOpened['orderId'] });
      // save transaction to db
      const orderInfo = plainToClass(OrderInfoDto, order);
      const todayDate = dateToString(new Date());
      const transaction = new Transaction();
      transaction.positionSide = this.positionMapping[side];
      transaction.symbol = symbol;
      transaction.isTrading = true;
      transaction.quantity = +orderInfo.origQty;
      transaction.buyOrderId = orderInfo.orderId;
      transaction.buyCost = +orderInfo.cumQuote;
      transaction.buyPrice = +orderInfo.avgPrice;
      transaction.buyDate = todayDate;
      transaction.updatedAt = todayDate;
      await this.transactionRepository.save(transaction);
      console.log('BuyNewPosition Success and save transaction to database');
      // return data from binance
      return {
        symbol: symbol,
        positionSide: this.positionMapping[side],
        quantity: quantity,
        buyPrice: +orderInfo.avgPrice,
        buyDate: todayDate,
      };
    } catch (e) {
      console.log('error from: ' + e);
    }
  }

  async closeCurrentPosition(currentPosition: Transaction): Promise<ClosedPositionDto> {
    try {
      console.log('Call function closeCurrentPosition');
      // close binance position
      const { symbol, quantity, buyPrice, buyCost, positionSide, buyDate, transactionId } = currentPosition;
      let order;
      if (positionSide == 'LONG') {
        order = await binance.futures.marketSell(symbol, quantity, {
          reduceOnly: true,
        });
      } else {
        order = await binance.futures.marketBuy(symbol, quantity, {
          reduceOnly: true,
        });
      }

      const orderInfo = plainToClass(OrderInfoDto,
        await binance.futures.orderStatus(symbol, { orderId: order['orderId'] }));

      const sellCost = +orderInfo.cumQuote;
      const closePrice = +orderInfo.avgPrice;
      // save transaction to database
      const todayDate = dateToString(new Date());
      currentPosition.isTrading = false;
      currentPosition.sellOrderId = orderInfo.orderId;
      currentPosition.sellCost = sellCost;
      currentPosition.sellDate = todayDate;
      currentPosition.sellPrice = closePrice;
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
        quantity: quantity,
        plPercentage: profitPercent,
        pl: profit,
        resultStatus: resultStatus,
        duration: buyDuration,
      };
    } catch (e) {
      console.log('error from: ' + e);
    }
  }

  async takeProfitPosition(currentPosition: Transaction, quantityTp: number): Promise<ClosedPositionDto> {
    console.log('Call function takeProfitPosition');
    // close binance position
    const { symbol, buyPrice, quantity, positionSide, buyDate, transactionId } = currentPosition;

    let order;
    if (positionSide == 'LONG') {
      order = await binance.futures.marketSell(symbol, quantityTp, {
        reduceOnly: true,
      });
    } else {
      order = await binance.futures.marketBuy(symbol, quantityTp, {
        reduceOnly: true,
      });
    }

    const orderInfo = plainToClass(OrderInfoDto,
      await binance.futures.orderStatus(symbol, { orderId: order['orderId'] }));

    // save transaction to database
    const sellCost = +orderInfo.cumQuote;
    const closePrice = +orderInfo.avgPrice;
    // save transaction to database
    const todayDate = dateToString(new Date());
    currentPosition.isTrading = false;
    currentPosition.sellOrderId = orderInfo.orderId;
    currentPosition.sellCost = sellCost;
    currentPosition.sellDate = todayDate;
    currentPosition.sellPrice = closePrice;
    currentPosition.updatedAt = todayDate;
    await this.transactionRepository.save(currentPosition);

    // create new transaction
    const transaction = new Transaction();
    transaction.positionSide = positionSide;
    transaction.quantity = quantity - quantityTp;
    transaction.isTrading = true;
    transaction.buyDate = buyDate;
    transaction.symbol = symbol;
    transaction.buyPrice = buyPrice;
    transaction.updatedAt = buyDate;
    await this.transactionRepository.save(transaction);
    console.log('BuyNewPosition Success and save transaction to database');

    const profitLossHistory = new ProfitLossHistory();
    const profitPercent = this.calProfitLossPercentage(buyPrice, +orderInfo.avgPrice, positionSide);
    const buyDuration = duration(new Date(buyDate), new Date());
    const resultStatus = profitPercent > 0 ? 'W' : 'L';
    const profit = +orderInfo.cumQuote;
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
      quantity: quantity,
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
    // const balance = await binance.futures.balance();
    const orderInfo = await binance.futures.orderStatus('BNBUSDT', { orderId: '35179042365' });
    // const orderInfo = await binance.futures.marketBuy('BNBUSDT', 0.04);
    // const orderInfo = await binance.futures.marketSell('BNBUSDT', 0.02, {
    //   reduceOnly: true,
    // });
    console.log(orderInfo);
    return orderInfo;
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
    currentPosition.map(position => {
      const positions = new OpeningPositionDataDto();
      const currentPrice = +currentPrices[position.symbol];
      const entryPrice = position.buyPrice;
      positions.transactionId = position.transactionId;
      positions.symbol = position.symbol;
      positions.positionSide = position.positionSide;
      positions.entryPrice = entryPrice;
      positions.markPrice = currentPrice;
      positions.profitLossPercentage = this.calProfitLossPercentage(entryPrice, currentPrice, position.positionSide);
      positions.duration = duration(new Date(position.buyDate), new Date(updatedAt));
      openingPositionDataDto.push(positions);
    });
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
    return await this.closeCurrentPosition(currentPosition);
  }

  async swapPositionByTransactionId(transactionId: number): Promise<SwapPositionDto> {
    console.log('Swap Position: Call function to close current position and buy new one.');
    const currentPosition = await this.transactionRepository.findOne(transactionId);
    const { symbol, positionSide } = currentPosition;
    const closedPosition = await this.closeCurrentPosition(currentPosition);
    const side = positionSide == 'LONG' ? SideEnum.SELL : SideEnum.BUY;
    const buyNewPosition = await this.buyNewPosition(symbol, side);
    return {
      symbol,
      closedPosition: closedPosition,
      buyPosition: buyNewPosition,
    };
  }

  async takeProfitByTransactionId(transactionId: number): Promise<ClosedPositionDto> {
    console.log('Take Profit: Calculate profit from cost and unrealized profit');
    const resp = Promise.all([
      this.transactionRepository.findOne(transactionId),
      this.appConfigRepository.getValueNumber('binance.future_leverage'),
    ]);
    const currentPosition = resp[0];
    const leverage = resp[1];
    const priceObject = await binance.futures.markPrice(currentPosition.symbol);
    const markPrice = priceObject['markPrice'];
    const unrealizedCost = currentPosition.quantity * markPrice;
    const cost = currentPosition.quantity * currentPosition.buyPrice;
    const profit = unrealizedCost - cost;
    if (profit <= 0) return;
    const quantity = this.calQuantity(currentPosition.symbol, profit, leverage, markPrice);
    if (quantity <= 0) return;
    return await this.takeProfitPosition(currentPosition, quantity);
  }

  calQuantity(symbol: string, limitPrice: number, leverage: number, markPrice: number): number {
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
    let percentage;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      percentage = ((buyCost - sellCost) / sellCost) * 100;
    } else {
      percentage = ((sellCost - buyCost) / buyCost) * 100;
    }
    return +percentage.toFixed(2);
  }

  calProfitLoss(buyCost: number, sellCost: number, positionSide?: string): number {
    let profit;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      profit = (buyCost - sellCost);
    } else {
      profit = (sellCost - buyCost);
    }
    const profitString = '' + profit.toFixed(2);
    return +profitString;
  }

}
