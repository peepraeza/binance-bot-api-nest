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

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  })],
  controllers: [AppController, WebhookController, BinanceController],
  providers: [AppService, BinanceOrderService, LineBotService, BinanceInfoService, GenerateMessageService],

})
export class AppModule {
}
