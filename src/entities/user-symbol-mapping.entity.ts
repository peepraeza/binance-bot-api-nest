import { Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import { ColumnNumericTransformer } from './transformer/column-numeric.transformer';
import { User } from './user.entity';
import { SymbolEntity } from './symbol.entity';

@Index('user_symbol_mapping_user_user_id_fk', ['userId'], {})
@Index('user_symbol_mapping_symbol_symbol_id_fk', ['symbolId'], {})
@Entity('user_symbol_mapping')
export class UserSymbolMapping {

  @Column('bigint', { name: 'user_id', primary: true, transformer: new ColumnNumericTransformer() })
  userId: number;

  @Column('bigint', { name: 'symbol_id', primary: true, transformer: new ColumnNumericTransformer() })
  symbolId: number;

  @Column('double', { name: 'limit_price', default: 10 })
  limitPrice: number;

  @Column('int', { name: 'leverage', default: 1 })
  leverage: number;

  @ManyToOne(
    () => User,
    user => user.transactions,
    {
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'userId' }])
  user: User;

  @ManyToOne(
    () => SymbolEntity,
    symbol => symbol.userSymbolMappings,
    {
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn([{ name: 'symbol_id', referencedColumnName: 'symbolId' }])
  symbol: SymbolEntity;

}
