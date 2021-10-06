import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class SaveMediaSourceDto {
  @ApiProperty({
    type: String,
    description: 'Uploaded file id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  fileId: string;
}