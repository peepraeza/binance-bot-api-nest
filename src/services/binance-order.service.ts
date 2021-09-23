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
import { PositionDto } from '../dto/future-position.dto';
import { OpeningPositionDataDto, OpeningPositionDto } from '../dto/opening-position.dto';
import { TradingHistoryDto } from '../dto/trading-history.dto';
import { plainToClass } from 'class-transformer';
import { YYYY_MM_DD } from '../constants/constants';
import { SendMessageService } from './send-message.service';
import { GenerateMessageService } from './generate-message.service';

@Injectable()
export class BinanceOrderService {
  private readonly positionMapping = { 'BUY': PositionSideEnum.BUY, 'SELL': PositionSideEnum.SELL };

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
  }


  //buy long or short position follow by signal from trading view
  async actionPosition(reqDto: TradingViewReqDto): Promise<void> {
    console.log('from trading view');
    const { symbol, side, openPrice } = reqDto;
    const positionSide = this.positionMapping[side.toUpperCase()];

    // send signal
    this.sendMessageService.sendAlertSignalMessage(reqDto);
    // this.lineBotService.sendAlertSignalMessage(reqDto);

    // validate signal has already opening
    const currentPosition = await this.transactionRepository.findOpeningPositionBySymbolAndSide(symbol);
    if (currentPosition) {
      if (currentPosition.positionSide == positionSide) {
        // send message : already opening
        // do nothing
      } else {
        // close current position and buy new position
        const closePosition = await this.closeCurrentPosition(currentPosition, +openPrice);
        const openPosition = await this.buyNewPosition(symbol, side, +openPrice);

        // send message : order already buy
        this.sendMessageService.sendAlertCloseAndOpenNewPositionMessage(reqDto);
      }
    } else {
      // buy new position save database
      const openPosition = await this.buyNewPosition(symbol, side, +openPrice);

      // send message : order already buy
      this.sendMessageService.sendAlertCloseAndOpenNewPositionMessage(reqDto);

    }
  }

  async closeCurrentPosition(currentPosition: Transaction, closePrice?: number): Promise<ClosedPositionDto> {
    console.log('closeCurrentPosition');
    // close binance position
    const { symbol, quantity, buyPrice, positionSide, buyDate, transactionId } = currentPosition;
    // if (positionSide == PositionSideEnum.BUY) {
    //   await binance.futures.marketSell(symbol, quantity);
    // } else {
    //   await binance.futures.marketBuy(symbol, quantity);
    // }

    // save transaction to database
    const todayDate = dateToString(new Date());
    currentPosition.isTrading = false;
    currentPosition.sellDate = todayDate;
    currentPosition.sellPrice = closePrice;
    currentPosition.updatedAt = todayDate;
    await this.transactionRepository.save(currentPosition);

    const profitLossHistory = new ProfitLossHistory();
    const profit = this.calProfitLoss(quantity, buyPrice, closePrice, positionSide);
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

    // return data from binance
    return {
      symbol: symbol,
      positionSide: positionSide,
      closedPrice: closePrice,
      closedTime: todayDate,
      plPercentage: profitPercent,
      pl: profit,
      resultStatus: resultStatus,
      duration: buyDuration,
    };
  }

  async buyNewPosition(symbol: string, side: string, openPrice?: number): Promise<object> {
    // open binance position
    const leverage = await this.appConfigRepository.getValueNumber('binance.future_leverage');
    // const resp = await binance.futures.leverage(symbol, leverage);
    // await binance.futures.marginType(symbol, 'ISOLATED');
    const quantity = await this.calculateQuantity(symbol);
    console.log('quantity: ' + quantity);

    let orderd;
    if (side == SideEnum.BUY) {
      const params = { positionSide: PositionSideEnum.BUY };
      // orderd = await binance.futures.marketBuy(symbol, quantity, params);
      // orderd = await binance.futures.buy(symbol, quantity, 410, params);
    } else {
      const params = { positionSide: PositionSideEnum.SELL };
      // orderd = await binance.futures.marketSell(symbol, quantity, params);
      // orderd = await binance.futures.marketBuy(symbol, quantity, params);
      // orderd = await binance.futures.sell(symbol, quantity, 410);
    }
    // save transaction to db
    const todayDate = dateToString(new Date());
    const transaction = new Transaction();
    transaction.positionSide = this.positionMapping[side];
    transaction.quantity = quantity;
    transaction.isTrading = true;
    transaction.buyDate = todayDate;
    transaction.symbol = symbol;
    transaction.buyPrice = openPrice;
    transaction.updatedAt = todayDate;
    await this.transactionRepository.save(transaction);

    // return data from binance
    return { openPrice: openPrice };
  }

  async calculateQuantity(symbol: string): Promise<number> {

    // get current price of that coin
    const resp = await Promise.all([
      await this.appConfigRepository.getValueNumber('binance.limit_price'),
      await this.appConfigRepository.getValueNumber('binance.future_leverage'),
    ]);
    const limitPrice = resp[0];
    const leverage = resp[1];
    const betPrice = limitPrice * leverage;
    const priceObject = await binance.futures.markPrice(symbol);
    const currentPrice = priceObject['markPrice'];
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

  // use this function in the future when everything is done
  async getCurrentPosition(): Promise<PositionDto[]> {
    const positions = await binance.futures.positionRisk();
    const currentPosition: PositionDto[] = positions.filter(position => +position.positionAmt != 0);
    console.log(currentPosition);
    return currentPosition;
  }

  async getCurrentPosition2(): Promise<OpeningPositionDto> {
    const positions = await binance.futures.positionRisk();
    const currentPosition: PositionDto[] = positions.filter(position => +position.positionAmt != 0);
    const openingPositionDataDto: OpeningPositionDataDto[] = [];
    let updatedAt;
    currentPosition.map(position => {
      const positions = new OpeningPositionDataDto();
      const currentPrice = +position.markPrice;
      const entryPrice = +position.entryPrice;
      positions.symbol = position.symbol;
      positions.positionSide = position.positionSide;
      positions.entryPrice = +entryPrice.toFixed(4);
      positions.markPrice = +currentPrice.toFixed(4);
      positions.profitLossPercentage = this.calProfitLossPercentage(entryPrice, currentPrice, position.positionSide);
      openingPositionDataDto.push(positions);
      updatedAt = dateToString(new Date(position.updateTime));
    });

    return {
      updateTime: updatedAt,
      position: openingPositionDataDto,
    };
  }

  async getTestCurrentPosition(): Promise<OpeningPositionDto> {
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

  async closePositionByTransactionId(transactionId: number, closePrice?: number): Promise<ClosedPositionDto> {
    console.log('closePositionByTransactionId');
    const currentPosition = await this.transactionRepository.findOne(transactionId);
    return await this.closeCurrentPosition(currentPosition, closePrice);
  }

  calProfitLossPercentage(entryPrice: number, currentPrice: number, positionSide?: string): number {
    let percentage;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      percentage = ((entryPrice - currentPrice) / currentPrice) * 100;
    } else {
      percentage = ((currentPrice - entryPrice) / entryPrice) * 100;
    }
    return +percentage.toFixed(2);
  }

  calProfitLoss(amount: number, entryPrice: number, currentPrice: number, positionSide?: string): number {
    let profit;
    if (positionSide && positionSide == PositionSideEnum.SELL) {
      profit = (entryPrice - currentPrice) * amount;
    } else {
      profit = (currentPrice - entryPrice) * amount;
    }
    const profitString = '' + profit.toFixed(2);
    return +profitString;
  }

}
