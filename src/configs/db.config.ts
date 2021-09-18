import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { getConfig, getNumberConfig } from './config';

@Injectable()
export class DbConfig implements TypeOrmOptionsFactory {

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: getConfig('DB_HOST'),
      port: getNumberConfig('DB_PORT'),
      username: getConfig('DB_USERNAME'),
      password: getConfig('DB_PASS'),
      database: getConfig('DB_NAME'),
      synchronize: true,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    };
  }
}
