import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class RemoveTagsDto {
  @ApiProperty({
    type: [String],
    description: 'Tag ids',
    required: true,
    example: ['268016436369163264']
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  ids: string | string[];
}
