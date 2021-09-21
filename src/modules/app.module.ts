import { Module } from '@nestjs/common';
import { AppController } from '../controllers/app.controller';
import { AppService } from '../services/app.service';
import { WebhookController } from '../controllers/webhook.controller';
import { BinanceOrderService } from '../services/binance-order.service';
import { LineBotService } from '../services/line-bot.service';
import { ConfigModule } from '@nestjs/config';
import { BinanceInfoService } from '../services/binance-info.service';
import { BinanceController } from '../controllers/binance.controller';
import { GenerateMessageService } from '../services/generate-message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbConfig } from '../configs/db.config';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AppConfigRepository } from '../repositories/appconfig.repository';
import { ProfitLossHistoryRepository } from '../repositories/profit-loss-history.repository';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), TypeOrmModule.forRootAsync({
    useClass: DbConfig,
  }),
    TypeOrmModule.forFeature([TransactionRepository, AppConfigRepository, ProfitLossHistoryRepository])],
  controllers: [AppController, WebhookController, BinanceController],
  providers: [AppService, BinanceOrderService, LineBotService, BinanceInfoService, GenerateMessageService],

})
export class AppModule {
}
