import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class DeletePlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Item id'
  })
  @Type(() => String)
  @IsOptional()
  itemId: string;

  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsOptional()
  mediaId: string;
}
