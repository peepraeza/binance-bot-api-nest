import { Column, Entity, OneToOne } from 'typeorm';
import { ColumnNumericTransformer } from './transformer/column-numeric.transformer';
import { PositionSideEnum } from '../enums/position-side.enum';
import { ProfitLossHistory } from './profit-loss-history.entity';

@Entity('transaction')
export class Transaction {

  @Column('bigint', {
    name: 'transaction_id',
    primary: true,
    generated: 'increment',
    transformer: new ColumnNumericTransformer(),
  })
  transactionId: number;

  @Column('varchar', { name: 'symbol', length: 100 })
  symbol: string;

  @Column('double', {
    name: 'quantity',
    transformer: new ColumnNumericTransformer(),
  })
  quantity: number;

  @Column('tinyint', { name: 'is_trading' })
  isTrading: boolean;

  @Column('varchar', { name: 'position_side', length: 100 })
  positionSide: PositionSideEnum;

  @Column('bigint', { name: 'buy_order_id', transformer: new ColumnNumericTransformer(), default: 1 })
  buyOrderId: number;

  @Column('double', { name: 'buy_cost', transformer: new ColumnNumericTransformer(), default: 0 })
  buyCost: number;

  @Column('double', { name: 'buy_price', transformer: new ColumnNumericTransformer() })
  buyPrice: number;

  @Column({ type: 'datetime', name: 'buy_date' })
  buyDate: Date | string;

  @Column('bigint', { name: 'sell_order_id', transformer: new ColumnNumericTransformer(), nullable: true })
  sellOrderId: number;

  @Column('double', { name: 'sell_cost', transformer: new ColumnNumericTransformer(), nullable: true })
  sellCost: number;

  @Column('double', { name: 'sell_price', transformer: new ColumnNumericTransformer(), nullable: true })
  sellPrice: number;

  @Column({ type: 'datetime', name: 'sell_date', nullable: true })
  sellDate: Date | string;

  @Column({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date | string;

  @OneToOne(() => ProfitLossHistory, (profitLossHistory: ProfitLossHistory) => profitLossHistory.transaction)
  profitLossHistory: ProfitLossHistory;

}
