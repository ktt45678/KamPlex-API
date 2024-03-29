import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNotEmpty, IsOptional, IsUrl, MaxLength, ValidateIf } from 'class-validator';

import { ExtStorageNameExist } from '../../../decorators/extstorage-name-exist.decorator';
import { IsOptionalIf } from '../../../decorators/is-optional-if.decorator';
import { CloudStorage, StatusCode } from '../../../enums';
import { EXTERNAL_STORAGE_KIND } from '../../../config';

export class AddStorageDto {
  @ApiProperty({
    type: String,
    description: 'An unique name',
    example: 'new api'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @ExtStorageNameExist({ context: { code: StatusCode.EXTERNAL_STORAGE_NAME_EXIST } })
  @MaxLength(100, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Kind of storage',
    enum: EXTERNAL_STORAGE_KIND
  })
  @Type(() => Number)
  @IsIn(EXTERNAL_STORAGE_KIND, { context: { code: StatusCode.IS_IN_ARRAY } })
  kind: number;

  @ApiProperty({
    type: String,
    description: 'Api client id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(4096, { context: { code: StatusCode.MAX_LENGTH } })
  clientId: string;

  @ApiProperty({
    type: String,
    description: 'Api client secret'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(4096, { context: { code: StatusCode.MAX_LENGTH } })
  clientSecret: string;

  @ApiProperty({
    type: String,
    description: 'Api access token',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(4096, { context: { code: StatusCode.MAX_LENGTH } })
  accessToken: string;

  @ApiProperty({
    type: String,
    description: 'Api refresh token'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(4096, { context: { code: StatusCode.MAX_LENGTH } })
  refreshToken: string;

  @ApiProperty({
    type: String,
    description: 'Expiration time of the current access token',
    required: false
  })
  @Type(() => Date)
  @ValidateIf(o => o.accessToken)
  @IsDate({ context: { code: StatusCode.IS_DATE } })
  expiry: Date;

  @ApiProperty({
    type: String,
    description: 'Folder id to save files, leave empty for root',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @MaxLength(1024, { context: { code: StatusCode.MAX_LENGTH } })
  folderId: string;

  @ApiProperty({
    type: String,
    description: 'Folder name to display',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @MaxLength(1024, { context: { code: StatusCode.MAX_LENGTH } })
  folderName: string;

  @ApiProperty({
    type: String,
    description: 'Public url of the api',
    required: false
  })
  @Type(() => String)
  @IsOptionalIf(o => o.kind !== CloudStorage.ONEDRIVE)
  @IsUrl({ require_protocol: true }, { context: { code: StatusCode.IS_URL } })
  publicUrl: string;

  @ApiProperty({
    type: String,
    description: 'Second public url of the api',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsUrl({ require_protocol: true }, { context: { code: StatusCode.IS_URL } })
  secondPublicUrl: string;
}
