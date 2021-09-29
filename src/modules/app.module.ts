import { Module } from '@nestjs/common';
import { AppController } from '../controllers/app.controller';
import { AppService } from '../services/app.service';
import { WebhookController } from '../controllers/webhook.controller';
import { BinanceOrderService } from '../services/binance-order.service';
import { LineBotService } from '../services/line-bot.service';
import { ConfigModule } from '@nestjs/config';
import { BinanceController } from '../controllers/binance.controller';
import { GenerateMessageService } from '../services/generate-message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbConfig } from '../configs/db.config';
import { TransactionRepository } from '../repositories/transaction.repository';
import { ProfitLossHistoryRepository } from '../repositories/profit-loss-history.repository';
import { SendMessageService } from '../services/send-message.service';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import { UserSymbolMappingRepository } from '../repositories/user-symbol-mapping.repository';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), TypeOrmModule.forRootAsync({
    useClass: DbConfig,
  }),
    TypeOrmModule.forFeature([TransactionRepository, ProfitLossHistoryRepository, UserRepository, UserSymbolMappingRepository])],
  controllers: [AppController, WebhookController, BinanceController],
  providers: [AppService, BinanceOrderService, LineBotService, GenerateMessageService, SendMessageService, UserService],

})
export class AppModule {
}
