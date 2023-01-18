import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { I18N_DEFAULT_LANGUAGE } from '../../config';

export class HeadersDto {
  @ApiProperty({
    name: 'Accept-Language',
    type: String,
    description: 'Language to translate',
    required: false
  })
  @Expose({ name: 'accept-language' })
  acceptLanguage: string = I18N_DEFAULT_LANGUAGE;

  @ApiProperty({
    name: 'X-Socket-ID',
    type: String,
    description: 'User socket id',
    required: false
  })
  @Expose({ name: 'x-socket-id' })
  socketId?: string;
}
