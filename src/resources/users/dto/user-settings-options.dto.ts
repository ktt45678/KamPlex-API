import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, Min, Max, IsInt, IsIn } from 'class-validator';

import { IsISO6391 } from '../../../decorators/is-iso-6391.decorator';
import { MediaVisibility, StatusCode, UserVisibility } from '../../../enums';
import { MEDIA_VISIBILITY_TYPES, USER_VISIBILITY_TYPES } from '../../../config';

export class MediaPlayerOptions {
  @ApiProperty({
    type: Boolean,
    description: 'Mute audio volume',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  muted: boolean;

  @ApiProperty({
    type: Number,
    description: 'Last selected audio volume',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100, { context: { code: StatusCode.MAX_NUMBER } })
  volume: number;

  @ApiProperty({
    type: Number,
    description: 'Last selected quality',
    required: false,
    minimum: 0,
    maximum: 10000,
    example: 720
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(10000, { context: { code: StatusCode.MAX_NUMBER } })
  quality: number;

  @ApiProperty({
    type: Number,
    description: 'Last selected playback speed',
    required: false,
    minimum: 10,
    maximum: 500,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(10, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(500, { context: { code: StatusCode.MAX_NUMBER } })
  speed: number;

  @ApiProperty({
    type: Boolean,
    description: 'Enable or disable subtitle',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  subtitle: boolean;

  @ApiProperty({
    type: String,
    description: 'Selected subtitle language',
    example: 'en',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  @IsISO6391({ context: { code: StatusCode.IS_ISO6391 } })
  subtitleLang: string;

  @ApiProperty({
    type: Boolean,
    description: 'Media player options',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  autoNextEp: boolean;
}

export class SubtitleOptions {
  @ApiProperty({
    type: Number,
    description: 'Font size',
    required: false,
    minimum: 25,
    maximum: 500,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(25, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(500, { context: { code: StatusCode.MAX_NUMBER } })
  fontSize: number;

  @ApiProperty({
    type: Number,
    description: 'Font family',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  fontFamily: string;

  @ApiProperty({
    type: Number,
    description: 'Font weight',
    required: false,
    minimum: 1,
    maximum: 9,
    example: 4
  })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(9, { context: { code: StatusCode.MAX_NUMBER } })
  fontWeight: number;

  @ApiProperty({
    type: Number,
    description: 'Text color',
    required: false,
    minimum: 0,
    maximum: 16777215,
    example: 0
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(16777215, { context: { code: StatusCode.MAX_NUMBER } })
  textColor: number;

  @ApiProperty({
    type: Number,
    description: 'Text opacity',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100, { context: { code: StatusCode.MAX_NUMBER } })
  textAlpha: number;

  @ApiProperty({
    type: Number,
    description: 'Text edge style',
    required: false,
    minimum: 1,
    maximum: 5,
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(5, { context: { code: StatusCode.MAX_NUMBER } })
  textEdge: number;

  @ApiProperty({
    type: Number,
    description: 'Background color',
    required: false,
    minimum: 0,
    maximum: 16777215,
    example: 0
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(16777215, { context: { code: StatusCode.MAX_NUMBER } })
  bgColor: number;

  @ApiProperty({
    type: Number,
    description: 'Background opacity',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100, { context: { code: StatusCode.MAX_NUMBER } })
  bgAlpha: number;

  @ApiProperty({
    type: Number,
    description: 'Window color',
    required: false,
    minimum: 0,
    maximum: 16777215,
    example: 0
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(16777215, { context: { code: StatusCode.MAX_NUMBER } })
  winColor: number;

  @ApiProperty({
    type: Number,
    description: 'Window opacity',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 100
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100, { context: { code: StatusCode.MAX_NUMBER } })
  winAlpha: number;
}

export class HistoryOptions {
  @ApiProperty({
    type: Number,
    description: 'Will mark a movie/episode as watched when this watch time percentage is reached',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 90
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100, { context: { code: StatusCode.MAX_NUMBER } })
  limit: number;

  @ApiProperty({
    type: Boolean,
    description: 'Pause watch history',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  paused: boolean;
}

export class PlaylistOptions {
  @ApiProperty({
    type: Number,
    description: 'Default visibility of playlist',
    required: false,
    enum: MEDIA_VISIBILITY_TYPES,
    example: MediaVisibility.UNLISTED
  })
  @Type(() => Number)
  @IsOptional()
  @IsIn(MEDIA_VISIBILITY_TYPES)
  visibility: number;

  @ApiProperty({
    type: String,
    description: 'Id of recent playlist'
  })
  @Type(() => String)
  @IsOptional()
  recentId: string;
}

export class RatingOptions {

}

export class HistoryListOptions {
  @ApiProperty({
    type: Number,
    description: 'View mode',
    required: false,
    minimum: 1,
    maximum: 2,
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(2, { context: { code: StatusCode.MAX_NUMBER } })
  view: number;

  @ApiProperty({
    type: Number,
    description: 'Visibility of user\'s history list',
    required: false,
    enum: USER_VISIBILITY_TYPES,
    example: UserVisibility.PRIVATE
  })
  @Type(() => Number)
  @IsOptional()
  @IsIn(USER_VISIBILITY_TYPES)
  visibility: number;
}

export class PlaylistListOptions {
  @ApiProperty({
    type: Number,
    description: 'View mode',
    required: false,
    minimum: 1,
    maximum: 2,
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(2, { context: { code: StatusCode.MAX_NUMBER } })
  view: number;
}

export class RatingListOptions {
  @ApiProperty({
    type: Number,
    description: 'View mode',
    required: false,
    minimum: 1,
    maximum: 2,
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(2, { context: { code: StatusCode.MAX_NUMBER } })
  view: number;

  @ApiProperty({
    type: Boolean,
    description: 'Edit mode',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  editMode: boolean;

  @ApiProperty({
    type: Number,
    description: 'Visibility of user\'s rating list',
    required: false,
    enum: USER_VISIBILITY_TYPES,
    example: UserVisibility.PRIVATE
  })
  @Type(() => Number)
  @IsOptional()
  @IsIn(USER_VISIBILITY_TYPES)
  visibility: number;
}
