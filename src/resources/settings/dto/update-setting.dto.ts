import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { StatusCode } from '../../../enums';
import { EncodingSetting } from '../entities/encoding-setting.entity';

export class UpdateSettingDto {
  @ApiProperty({
    type: String,
    description: 'Id of the new owner',
    example: '343990254685390848'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  owner: string;

  @ApiProperty({
    type: String,
    description: 'Array of media source storage ids',
    example: ['348439240749508608', '349125882529332224']
  })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsString({ each: true, context: { code: StatusCode.IS_STRING_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  mediaSourceStorages: string[];

  @ApiProperty({
    type: Number,
    description: 'Default codecs for streams',
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  defaultStreamCodecs: number;

  @ApiProperty({
    type: String,
    description: 'Audio params',
    example: '-c:a libfdk_aac -vbr 5'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  streamAudioParams: string;

  @ApiProperty({
    type: String,
    description: 'Audio second track params',
    example: '-c:a libfdk_aac -vbr 5'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  streamAudio2Params: string;

  @ApiProperty({
    type: String,
    description: 'H264 params',
    example: '-c:v libx264 -preset slow -crf 18'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  streamH264Params: string;

  @ApiProperty({
    type: String,
    description: 'VP9 params',
    example: '-c:v libvpx-vp9 -crf 24 -b:v 0'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  streamVP9Params: string;

  @ApiProperty({
    type: String,
    description: 'AV1 params',
    example: '-c:v libaom-av1 -crf 24 -b:v 0'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  streamAV1Params: string;

  @ApiProperty({
    type: Number,
    description: 'Quality list',
    example: [1080, 720, 480, 360]
  })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsNumber({}, { each: true, context: { code: StatusCode.IS_NUMBER_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  streamQualityList: number[];

  @ApiProperty({
    type: [EncodingSetting],
    description: 'Per quality encoding settings'
  })
  @Type(() => EncodingSetting)
  @ValidateNested({ each: true })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  streamEncodingSettings: EncodingSetting[]
}
