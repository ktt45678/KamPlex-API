import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class DeletePlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Item id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  itemId: bigint;

  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  mediaId: bigint;
}
