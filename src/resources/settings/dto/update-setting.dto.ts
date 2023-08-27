import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

import { StatusCode } from '../../../enums';
import { EncodingSetting } from '../entities/encoding-setting.entity';
import { transformBigInt } from '../../../utils';

export class UpdateSettingDto {
  @ApiProperty({
    type: String,
    description: 'Id of the new owner',
    example: '343990254685390848'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  owner: bigint;

  @ApiProperty({
    type: String,
    description: 'Array of media source storage ids',
    example: ['348439240749508608', '349125882529332224']
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  mediaSourceStorages: bigint[];

  @ApiProperty({
    type: String,
    description: 'Array of linked media source storage ids',
    example: ['348439240749508608', '349125882529332224']
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  linkedMediaSourceStorages: bigint[];

  @ApiProperty({
    type: Number,
    description: 'Default codecs for videos',
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  defaultVideoCodecs: number;

  @ApiProperty({
    type: String,
    description: 'Audio params for better compability',
    example: '-c:a libfdk_aac -vbr 5 -ac 2'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  audioParams: string;

  @ApiProperty({
    type: String,
    description: 'Audio params for better download speed',
    example: '-c:a libopus -b:a 128K -vbr on'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  audioSpeedParams: string;

  @ApiProperty({
    type: String,
    description: 'Audio second track params',
    example: '-c:a libfdk_aac -vbr 5'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  audioSurroundParams: string;

  @ApiProperty({
    type: String,
    description: 'H264 params',
    example: '-c:v libx264 -preset slow -crf 18'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  videoH264Params: string;

  @ApiProperty({
    type: String,
    description: 'VP9 params',
    example: '-c:v libvpx-vp9 -crf 24 -b:v 0'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  videoVP9Params: string;

  @ApiProperty({
    type: String,
    description: 'AV1 params',
    example: '-c:v libaom-av1 -crf 24 -b:v 0'
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  videoAV1Params: string;

  @ApiProperty({
    type: Number,
    description: 'Quality list',
    example: [1080, 720, 480, 360]
  })
  @IsOptional()
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  @IsNumber({}, { each: true, context: { code: StatusCode.IS_NUMBER_ARRAY } })
  @ArrayUnique(s => s, { context: { code: StatusCode.ARRAY_UNIQUE } })
  videoQualityList: number[];

  @ApiProperty({
    type: [EncodingSetting],
    description: 'Per quality encoding settings'
  })
  @Type(() => EncodingSetting)
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray({ context: { code: StatusCode.IS_ARRAY } })
  videoEncodingSettings: EncodingSetting[]
}
