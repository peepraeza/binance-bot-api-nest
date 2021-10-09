import { EntityRepository, Repository } from 'typeorm';
import { SymbolEntity } from '../entities/symbol.entity';

@EntityRepository(SymbolEntity)
export class SymbolRepository extends Repository<SymbolEntity> {

}
