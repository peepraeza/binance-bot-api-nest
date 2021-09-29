import { Controller, Get} from '@nestjs/common';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get()
  async getHello() {
    return this.appService.getHello();
  }
}
