import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateSettingDto {
  @ApiProperty({
    type: String,
    description: 'Id of the new owner',
    example: '343990254685390848'
  })
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  owner: string;

  @ApiProperty({
    type: String,
    description: 'Id of the media poster storage',
    example: '348368418861025280'
  })
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  mediaPosterStorage: string;

  @ApiProperty({
    type: String,
    description: 'Id of the media backdrop storage',
    example: '348415273285090304'
  })
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  mediaBackdropStorage: string;

  @ApiProperty({
    type: String,
    description: 'Array of media source storage ids',
    example: ['348439240749508608', '349125882529332224']
  })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  mediaSourceStorages: string[];
}
