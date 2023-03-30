import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindAddToPlaylistDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsOptional()
  mediaId: string;

  @ApiProperty({
    type: String,
    description: 'Search playlist by name'
  })
  @Type(() => String)
  @IsOptional()
  search: string;
}
