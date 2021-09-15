import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { getConfig } from '../configs/config';

@Injectable()
export class TradingViewGuard implements CanActivate {


  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.validateToken(context);
  }

  async validateToken(context: ExecutionContext): Promise<boolean> {
    // Get token
    const req = context.switchToHttp().getRequest();
    const body = req.body;
    const tokenConfig = getConfig('TOKEN')
    return body['token'] == tokenConfig;
  }
}
