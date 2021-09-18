import { Injectable } from '@nestjs/common';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import { LineBotService } from './line-bot.service';
import { BinanceInfoService } from './binance-info.service';
import { PositionSideEnum } from '../enums/position-side.enum';
import { TransactionRepository } from '../repositories/transaction.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { countDecimals, getTodayDate } from '../utils/utils';
import binance from '../configs/binance.config';
import { SideEnum } from '../enums/side.enum';
import * as minNotional from '../constant-json/minNotional.json';
import { AppConfigRepository } from '../repositories/appconfig.repository';

@Injectable()
export class BinanceOrderService {
  private readonly positionMapping = { 'BUY': PositionSideEnum.BUY, 'SELL': PositionSideEnum.SELL };

  constructor(
    private readonly lineBotService: LineBotService,
    private readonly binanceInfoService: BinanceInfoService,
    @InjectRepository(TransactionRepository)
    private transactionRepository: TransactionRepository,
    private appConfigRepository: AppConfigRepository,
  ) {
  }


  async buySellPosition(reqDto: TradingViewReqDto): Promise<void> {
    console.log('from trading view');
    const { symbol, side, openPrice } = reqDto;
    const positionSide = this.positionMapping[side.toUpperCase()];

    // send signal
    this.lineBotService.sendAlertSignalMessage(reqDto);

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
        this.lineBotService.sendAlertCloseAndOpenNewPositionMessage(reqDto);
      }
    } else {
      // buy new position save database
      const openPosition = await this.buyNewPosition(symbol, side, +openPrice);

      // send message : order already buy
      this.lineBotService.sendAlertCloseAndOpenNewPositionMessage(reqDto);

    }
  }

  async closeCurrentPosition(currentPosition: Transaction, closePrice?: number): Promise<object> {
    // close binance position
    const { symbol, positionSide, quantity } = currentPosition;
    // if (positionSide == PositionSideEnum.BUY) {
    //   await binance.futures.marketSell(symbol, quantity);
    // } else {
    //   await binance.futures.marketBuy(symbol, quantity);
    // }

    // save transaction to database
    const todayDate = getTodayDate();
    currentPosition.isTrading = false;
    currentPosition.sellDate = todayDate;
    currentPosition.sellPrice = closePrice;
    currentPosition.updatedAt = todayDate;
    await this.transactionRepository.save(currentPosition);

    // return data from binance
    return { closePrice: closePrice };
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
    const todayDate = getTodayDate();
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

}
