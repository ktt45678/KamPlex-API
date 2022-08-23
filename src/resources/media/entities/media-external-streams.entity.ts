import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class MediaExternalStreams {
  @ApiProperty({
    type: String,
    description: 'Media id from Gogoanime'
  })
  @Type(() => String)
  @IsOptional()
  gogoanimeId: string;

  @ApiProperty({
    type: String,
    description: 'Media id and episode id from FlixHQ'
  })
  @Type(() => String)
  @IsOptional()
  flixHQId: string;

  @ApiProperty({
    type: String,
    description: 'Media id from Zoro'
  })
  @Type(() => String)
  @IsOptional()
  zoroId: string;
}
