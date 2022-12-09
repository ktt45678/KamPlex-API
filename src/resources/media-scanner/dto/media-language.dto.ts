import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

import { StatusCode } from '../../../enums';

export class MediaLanguageDto {
  @ApiProperty({
    type: String,
    description: 'Language in ISO 639-1 (Pattern: ^[a-z]{2}-[A-Z]{2}$)',
    required: false
  })
  @IsOptional()
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, { context: { code: StatusCode.MATCHES_REGEX } })
  language: string;
}