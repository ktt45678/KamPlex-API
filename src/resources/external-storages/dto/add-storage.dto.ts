import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNotEmpty, IsOptional, IsUrl, MaxLength, ValidateIf } from 'class-validator';

import { ExtStorageNameExist } from '../../../decorators/extstorage-name-exist.decorator';
import { EXTERNAL_STORAGE_KIND } from '../../../config';
import { CloudStorage } from '../../../enums/cloud-storage.enum';
import { StatusCode } from '../../../enums/status-code.enum';

export class AddStorageDto {
  @ApiProperty({
    type: String,
    description: 'An unique name',
    example: 'new api'
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ExtStorageNameExist({ context: { code: StatusCode.EXTERNAL_STORAGE_NAME_EXIST } })
  @MaxLength(32, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Kind of api',
    enum: EXTERNAL_STORAGE_KIND
  })
  @IsIn(EXTERNAL_STORAGE_KIND, { context: { code: StatusCode.IS_IN_ARRAY } })
  kind: string;

  @ApiProperty({
    type: String,
    description: 'Api access token',
    required: false
  })
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(2048, { context: { code: StatusCode.MAX_LENGTH } })
  accessToken: string;

  @ApiProperty({
    type: String,
    description: 'Api refresh token'
  })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(2048, { context: { code: StatusCode.MAX_LENGTH } })
  refreshToken: string;

  @ApiProperty({
    type: String,
    description: 'Expiration time of the current access token',
    required: false
  })
  @Type(() => Date)
  @ValidateIf(o => o.accessToken)
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  expiresAt: Date;

  @ApiProperty({
    type: String,
    description: 'Folder id to save files, leave empty for root',
    required: false
  })
  @IsOptional()
  @MaxLength(1024, { context: { code: StatusCode.MAX_LENGTH } })
  folderId: string;

  @ApiProperty({
    type: String,
    description: 'Folder name to display',
    required: false
  })
  @IsOptional()
  @MaxLength(1024, { context: { code: StatusCode.MAX_LENGTH } })
  folderName: string;

  @ApiProperty({
    type: String,
    description: 'Public url of the api',
    required: false
  })
  @ValidateIf(o => o.kind === CloudStorage.GOOGLE_DRIVE)
  @IsUrl({ require_protocol: true }, { context: { code: StatusCode.IS_URL } })
  publicUrl: string;
}