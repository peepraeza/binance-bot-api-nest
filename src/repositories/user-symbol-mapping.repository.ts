import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserSymbolMapping } from '../entities/user-symbol-mapping.entity';

@EntityRepository(User)
export class UserSymbolMappingRepository extends Repository<UserSymbolMapping> {

  async findSymbolInfoByUserIdAndSymbol(userId: number, symbol: string): Promise<UserSymbolMapping> {
    return this.createQueryBuilder('usm')
      .where('usm.userId = :userId', { userId: userId })
      .andWhere('usm.symbolName =:symbol', { symbol: symbol })
      .getOne();
  }
}
