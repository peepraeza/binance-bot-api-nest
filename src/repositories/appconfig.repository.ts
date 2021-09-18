import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';
import { AppConfig } from '../entities/appconfig.entity';
import { AppConfigNumberType, AppconfigType } from '../types/appconfig.type';

@EntityRepository(AppConfig)
export class AppConfigRepository extends Repository<AppConfig> {

	async findByKey(key: AppconfigType): Promise<AppConfig> {
		const query: SelectQueryBuilder<AppConfig> = this.createQueryBuilder(
			'appconfig'
		);
		query.andWhere('appconfig.app_config_key = :key', { key });
		return query.getOne();
	}

	async getValue(key: AppconfigType): Promise<string> {
		const appConfig: AppConfig = await this.findByKey(key);
		return appConfig.appConfigValue;
	}

	async getValueNumber(key: AppConfigNumberType): Promise<number> {
		const appConfig: AppConfig = await this.findByKey(key);
		return Number(appConfig.appConfigValue);
	}

}
