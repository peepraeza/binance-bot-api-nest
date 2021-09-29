import { EntityRepository, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {

  async findUserByLineUserId(lineUserId: string): Promise<User> {
    return this.createQueryBuilder('u')
      .where('u.lineUserId = :lineUserId', { lineUserId: lineUserId })
      .andWhere('u.deletedAt is null')
      .getOne();
  }

  async findUserByCoinSelected(coin: string): Promise<User[]> {
    return this.createQueryBuilder('u')
      .innerJoinAndSelect('u.userSymbolMappings', 'usm')
      .innerJoinAndSelect('usm.symbol', 's')
      .where('s.symbolName = :coin', { coin: coin })
      .andWhere('u.binanceData is not NULL')
      .getMany();
  }


}
