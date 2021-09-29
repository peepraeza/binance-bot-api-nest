import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { ColumnNumericTransformer } from './transformer/column-numeric.transformer';
import { Transaction } from './transaction.entity';
import { UserSymbolMapping } from './user-symbol-mapping.entity';

@Entity('symbol')
export class SymbolEntity {

  @Column('bigint', {
    name: 'symbol_id',
    primary: true,
    generated: 'increment',
    transformer: new ColumnNumericTransformer(),
  })
  symbolId: number;

  @Column('varchar', { name: 'symbol_name', length: 20 })
  symbolName: string;

  @OneToMany(
    () => UserSymbolMapping,
    userSymbolMapping => userSymbolMapping.symbol
  )
  userSymbolMappings: UserSymbolMapping[];

}
