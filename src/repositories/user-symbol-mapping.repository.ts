import { EntityRepository, Repository } from 'typeorm';
import { UserSymbolMapping } from '../entities/user-symbol-mapping.entity';

@EntityRepository(UserSymbolMapping)
export class UserSymbolMappingRepository extends Repository<UserSymbolMapping> {

  async findSymbolInfoByUserIdAndSymbol(userId: number, symbol: string): Promise<UserSymbolMapping> {
    return this.createQueryBuilder('usm')
      .innerJoinAndSelect('usm.symbol', 's')
      .where('usm.userId = :userId', { userId: userId })
      .andWhere('s.symbolName =:symbol', { symbol: symbol })
      .getOne();
  }
}
