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
  getHealth(): object {
    return this.appService.getHealth();
  }
}
