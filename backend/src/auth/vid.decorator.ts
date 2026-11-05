import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IdentifiedRequest } from './vid.guard';

// Only meaningful on routes protected by VidGuard.
export const Vid = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number =>
    context.switchToHttp().getRequest<IdentifiedRequest>().vid,
);
