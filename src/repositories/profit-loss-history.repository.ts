import { EntityRepository, Repository } from 'typeorm';
import { ProfitLossHistory } from '../entities/profit-loss-history.entity';

@EntityRepository(ProfitLossHistory)
export class ProfitLossHistoryRepository extends Repository<ProfitLossHistory> {
}
