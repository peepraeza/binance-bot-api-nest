import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get()
  async getHello(
    @Query('id') id: string,
  ): Promise<string> {
    return await this.appService.getHello(id);
  }
}
