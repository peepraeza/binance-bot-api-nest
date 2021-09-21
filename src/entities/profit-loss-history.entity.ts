import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ColumnNumericTransformer } from './transformer/column-numeric.transformer';
import { Transaction } from './transaction.entity';

@Entity('profit_loss_history')
export class ProfitLossHistory {

  @Column('bigint', {
    name: 'transaction_id',
    primary: true,
    generated: 'increment',
    transformer: new ColumnNumericTransformer(),
  })
  transactionId: number;

  @Column('double', {
    name: 'pl',
    transformer: new ColumnNumericTransformer(),
  })
  pl: number;

  @Column('double', {
    name: 'pl_percentage',
    transformer: new ColumnNumericTransformer(),
  })
  plPercentage: number;

  @Column('varchar', { name: 'result_status', length: 10 })
  resultStatus: string;

  @Column('varchar', { name: 'duration', length: 200 })
  duration: string;

  @Column('date', { name: 'sell_date' })
  sellDate: Date | string;

  @OneToOne(() => Transaction, (transaction: Transaction) => transaction.profitLossHistory)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;


}
