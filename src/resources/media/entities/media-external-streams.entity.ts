import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { IsOptionalIf } from '../../../decorators/is-optional-if.decorator';

export class MediaExternalStreams {
  @ApiProperty({
    type: String,
    description: 'Stream id extracted from Gogoanime'
  })
  @Type(() => String)
  @IsOptional()
  gogoanimeId: string;

  @ApiProperty({
    type: String,
    description: 'Media id from FlixHQ'
  })
  @Type(() => String)
  @IsOptionalIf(o => o.flixHQEpId == null)
  flixHQId: string;

  @ApiProperty({
    type: String,
    description: 'Episode id from FlixHQ'
  })
  @Type(() => String)
  @IsOptionalIf(o => o.flixHQId == null)
  flixHQEpId: string;
}
