import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome(): object {
    return { message: 'Welcome to LinkUp API' };
  }
}
