import { EntityRepository, Repository } from 'typeorm';
import { ProfitLossHistory } from '../entities/profit-loss-history.entity';

@EntityRepository(ProfitLossHistory)
export class ProfitLossHistoryRepository extends Repository<ProfitLossHistory> {

  async findSummaryTradingHistory(): Promise<any[]> {
    return await this.query(`
            SELECT sell_date                         as sellDate,
             AVG(pl_percentage)                      as avg,
             COUNT(IF(result_status = 'W', 1, null)) as win,
             COUNT(IF(result_status = 'L', 1, null)) as loss,
             COUNT(result_status)                    as total
            FROM profit_loss_history
            GROUP BY sell_date
            `);
  }
}
