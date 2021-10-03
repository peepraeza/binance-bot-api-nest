import { EntityRepository, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@EntityRepository(Transaction)
export class TransactionRepository extends Repository<Transaction> {

  async findOpeningPositionBySymbolAndUser(symbol: string, userId: number): Promise<Transaction> {
    return this.createQueryBuilder('t')
      .where('t.symbol = :symbol', { symbol: symbol })
      .andWhere('t.userId = :userId', { userId: userId })
      .andWhere('t.isTrading = 1')
      .getOne();
  }

  async findAllOpeningPosition(): Promise<Transaction[]> {
    return this.createQueryBuilder('t')
      .where('t.isTrading = 1')
      .getMany();
  }

  async findAllOpeningPositionByUserLindId(lineUserId: string): Promise<Transaction[]> {
    return this.createQueryBuilder('t')
      .innerJoinAndSelect('user', 'u')
      .where('t.isTrading = 1')
      .andWhere('u.lineUserId = :lineUserId', { lineUserId: lineUserId })
      .getMany();
  }

  async getClosePositionDetailsByTransactionId(transactionId: number): Promise<object[]> {
    return await this.query(`
        select 
            t.transaction_id as transactionId,
             symbol,
             position_side  as positionSide,
             buy_price      as buyPrice,
             sell_price     as closedPrice,
             sell_quantity  as quantity,
             pl,
             pl_percentage  as plPercentage,
             buy_date       as closedTime,
             duration,
             result_status  as resultStatus
        from transaction t
            inner join profit_loss_history plh on t.transaction_id = plh.transaction_id
        where plh.transaction_id = ${transactionId}`);
  }


}
