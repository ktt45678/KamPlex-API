import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Length, Max, Min } from 'class-validator';

import { IsEndsWith } from '../../../decorators/is-ends-with.decorator';
import { StatusCode } from '../../../enums/status-code.enum';
import { UPLOAD_MEDIA_SOURCE_EXT, UPLOAD_MEDIA_SOURCE_TYPES, UPLOAD_MEDIA_SOURCE_MAX_SIZE } from '../../../config';

export class AddMediaSourceDto {
  @ApiProperty({
    type: String,
    description: 'Filename, must end with .mp4',
    example: 'media.mp4'
  })
  @Type(() => String)
  @Length(1, 1024, { context: { code: StatusCode.LENGTH } })
  @IsEndsWith(UPLOAD_MEDIA_SOURCE_EXT, { context: { code: StatusCode.IS_ENDS_WITH } })
  filename: string;

  @ApiProperty({
    type: String,
    description: 'Mime type',
    enum: UPLOAD_MEDIA_SOURCE_TYPES,
    example: 'video/mp4'
  })
  @Type(() => String)
  @IsIn(UPLOAD_MEDIA_SOURCE_TYPES, { context: { code: StatusCode.IS_IN_ARRAY } })
  mimeType: string;

  @ApiProperty({
    type: Number,
    description: 'Type of request: 1 (Request to create an upload url) or 2 (Confirm the file has been uploaded)',
    enum: [1, 2]
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(UPLOAD_MEDIA_SOURCE_MAX_SIZE, { context: { code: StatusCode.MAX_NUMBER } })
  size: number;
}