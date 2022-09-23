import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { IsOptionalIf } from '../../../decorators/is-optional-if.decorator';
import { StatusCode } from '../../../enums';

export class UpdatePlaylistItemDto {
  @ApiProperty({
    type: Number,
    description: 'Reorder type (-1: Before, 1: After)'
  })
  @Type(() => Number)
  @IsOptional()
  @IsIn([-1, 1], { context: { code: StatusCode.IS_IN_ARRAY } })
  reorderType: number;

  @ApiProperty({
    type: String,
    description: 'Reorder before or after another item id'
  })
  @Type(() => String)
  @IsOptionalIf(o => o.reorderType == undefined)
  reorderInsertTo: string;
}
