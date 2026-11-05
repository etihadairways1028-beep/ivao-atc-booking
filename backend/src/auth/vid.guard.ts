import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const VID_HEADER = 'x-ivao-vid';

export type IdentifiedRequest = Request & { vid: number };

/**
 * Identifies the user from the VID header. Per the exercise we trust the
 * header as-is (no real authentication), we only make sure it is a sane VID.
 */
@Injectable()
export class VidGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IdentifiedRequest>();
    const header = request.headers[VID_HEADER];

    if (typeof header !== 'string' || !/^[1-9]\d{0,8}$/.test(header)) {
      throw new UnauthorizedException(
        `A valid VID must be sent in the ${VID_HEADER} header`,
      );
    }

    request.vid = Number(header);
    return true;
  }
}
