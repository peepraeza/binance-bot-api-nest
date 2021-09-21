import { Injectable } from '@nestjs/common';
import binance from '../configs/binance.config';
import { PositionDto } from '../dto/future-position.dto';
import { TransactionRepository } from '../repositories/transaction.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { AppConfigRepository } from '../repositories/appconfig.repository';
import { OpeningPositionDataDto, OpeningPositionDto } from '../dto/opening-position.dto';
import { dateToString, duration } from '../utils/utils';
import { Transaction } from '../entities/transaction.entity';
import { PositionSideEnum } from '../enums/position-side.enum';
import { ProfitLossHistory } from '../entities/profit-loss-history.entity';
import { ProfitLossHistoryRepository } from '../repositories/profit-loss-history.repository';

@Injectable()
export class BinanceInfoService {
  constructor(
    @InjectRepository(TransactionRepository)
    private transactionRepository: TransactionRepository,
    @InjectRepository(AppConfigRepository)
    private appConfigRepository: AppConfigRepository,
    @InjectRepository(ProfitLossHistoryRepository)
    private profitLossHistoryRepository: ProfitLossHistoryRepository,
  ) {
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

  // async batchSaveHistoryInfo(): Promise<void> {
  //   const closedTransaction = await this.transactionRepository.find({ isTrading: false });
  //   const profitLossHistories: ProfitLossHistory[] = [];
  //   closedTransaction.map(transaction => {
  //     const profitLossHistory = new ProfitLossHistory();
  //     const { quantity, buyPrice, sellPrice, positionSide, buyDate, sellDate, transactionId } = transaction;
  //     const profit = this.calProfitLoss(quantity, buyPrice, sellPrice, positionSide);
  //     const profitPercent = this.calProfitLossPercentage(buyPrice, sellPrice, positionSide);
  //     profitLossHistory.transactionId = transactionId;
  //     profitLossHistory.pl = profit;
  //     profitLossHistory.plPercentage = profitPercent
  //     profitLossHistory.duration = duration(new Date(buyDate), new Date(sellDate));
  //     profitLossHistory.resultStatus = profitPercent > 0 ? 'W' : 'L';
  //     profitLossHistory.sellDate = new Date(sellDate);
  //     profitLossHistories.push(profitLossHistory);
  //   });
  //   await this.profitLossHistoryRepository.save(profitLossHistories);
  // }

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
