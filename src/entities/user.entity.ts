import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { ColumnNumericTransformer } from './transformer/column-numeric.transformer';
import { Transaction } from './transaction.entity';
import { UserSymbolMapping } from './user-symbol-mapping.entity';

@Entity('user')
export class User {

  @Column('bigint', {
    name: 'user_id',
    primary: true,
    generated: 'increment',
    transformer: new ColumnNumericTransformer(),
  })
  userId: number;

  @Column('varchar', { name: 'line_user_id', length: 100 })
  lineUserId: string;

  @Column('tinyint', { name: 'is_ready_to_trade', default: false })
  isReadyToTrade: boolean;

  @Column('tinyint', { name: 'is_setting', default: false })
  isSetting: boolean;

  @Column('varchar', { name: 'binance_data', length: 255, nullable: true })
  binanceData: string;

  @Column('datetime', { name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date | string;

  @Column('datetime', { name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date | string;

  @Column('datetime', { name: 'deleted_at', nullable: true })
  deletedAt: Date | string;

  @OneToMany(
    () => Transaction,
    transaction => transaction.user,
  )
  transactions: Transaction[];

  @OneToMany(
    () => UserSymbolMapping,
    userSymbolMapping => userSymbolMapping.user,
  )
  userSymbolMappings: UserSymbolMapping[];

}
