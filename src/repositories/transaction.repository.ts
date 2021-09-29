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


}
