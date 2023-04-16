import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindAddToPlaylistDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  mediaId: bigint;

  @ApiProperty({
    type: String,
    description: 'Search playlist by name'
  })
  @Type(() => String)
  @IsOptional()
  search: string;
}
