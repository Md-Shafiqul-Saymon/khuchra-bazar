import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const req = context.switchToHttp().getRequest();
      if (req.headers.accept?.includes('text/html')) {
        const res = context.switchToHttp().getResponse();
        res.redirect('/admin/login');
        throw new UnauthorizedException();
      }
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
