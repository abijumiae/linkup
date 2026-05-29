import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getWelcome(): object {
    return this.appService.getWelcome();
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'linkup-backend',
      time: new Date().toISOString(),
    };
  }
}
