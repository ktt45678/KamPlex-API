import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

import { StatusCode } from 'src/enums/status-code.enum';

export class MediaDetailsDto {
  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: ['movie', 'tv']
  })
  @IsIn(['movie', 'tv'])
  type: string;

  @ApiProperty({
    type: String,
    description: 'Language in ISO 639-1 (Pattern: ^[a-z]{2}-[A-Z]{2}$)',
    required: false
  })
  @IsOptional()
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, { context: { code: StatusCode.MATCHES_REGEX } })
  language: string;
}
