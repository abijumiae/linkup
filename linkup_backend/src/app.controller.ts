import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      status: 'ok',
      service: 'linkup-backend',
      message: 'LinkUp backend is running',
    };
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
