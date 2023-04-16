// https://github.com/nestjs/nest/blob/master/packages/common/pipes/parse-int.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, Optional, ParseIntPipeOptions, HttpStatus, HttpException } from '@nestjs/common';

import { StatusCode } from '../../enums';

@Injectable()
export class ParseBigIntPipe implements PipeTransform {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() options?: ParseIntPipeOptions) {
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } = options;

    this.exceptionFactory = exceptionFactory ||
      (error => new HttpException({ code: StatusCode.IS_ALPHANUMERIC, message: error }, errorHttpStatusCode));
  }

  transform(value: string, metadata: ArgumentMetadata) {
    if (!this.isNumeric(value)) {
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)',
      );
    }
    return BigInt(value);
  }

  protected isNumeric(value: string): boolean {
    return (
      ['string', 'number'].includes(typeof value) &&
      /^-?\d+$/.test(value) &&
      isFinite(value as any)
    );
  }
}
