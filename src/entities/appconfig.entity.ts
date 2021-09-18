import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('appconfig')
export class AppConfig extends BaseEntity {
	@PrimaryGeneratedColumn({ type: 'bigint', name: 'app_config_id' })
	appConfigId: number;

	@Column('varchar', { name: 'app_config_key', length: 200 })
	appConfigKey: string;

	@Column('varchar', { name: 'app_config_value', length: 200 })
	appConfigValue: string;

	@Column('timestamp', {
		name: 'updated_at',
		default: () => 'CURRENT_TIMESTAMP'
	})
	updatedAt: Date;

	@Column('timestamp', {
		name: 'created_at',
		default: () => 'CURRENT_TIMESTAMP'
	})
	createdAt: Date;

}
