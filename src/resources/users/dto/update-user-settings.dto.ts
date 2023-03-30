import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import {
  MediaPlayerOptions, SubtitleOptions, HistoryOptions, HistoryListOptions, PlaylistListOptions,
  RatingListOptions, PlaylistOptions
} from './user-settings-options.dto';

export class UpdateUserSettingsDto {
  @ApiProperty({
    type: MediaPlayerOptions,
    description: 'Media player options',
    required: false
  })
  @Type(() => MediaPlayerOptions)
  @IsOptional()
  @ValidateNested()
  mediaPlayer: MediaPlayerOptions;

  @ApiProperty({
    type: SubtitleOptions,
    description: 'Subtitle options',
    required: false
  })
  @Type(() => SubtitleOptions)
  @IsOptional()
  @ValidateNested()
  subtitle: SubtitleOptions;

  @ApiProperty({
    type: HistoryOptions,
    description: 'History options',
    required: false
  })
  @Type(() => HistoryOptions)
  @IsOptional()
  @ValidateNested()
  history: HistoryOptions;

  @ApiProperty({
    type: PlaylistOptions,
    description: 'Playlist options',
    required: false
  })
  @Type(() => PlaylistOptions)
  @IsOptional()
  @ValidateNested()
  playlist: PlaylistOptions;

  @ApiProperty({
    type: HistoryListOptions,
    description: 'History list options',
    required: false
  })
  @Type(() => HistoryListOptions)
  @IsOptional()
  @ValidateNested()
  historyList: HistoryListOptions;

  @ApiProperty({
    type: PlaylistListOptions,
    description: 'Playlist list options',
    required: false
  })
  @Type(() => PlaylistListOptions)
  @IsOptional()
  @ValidateNested()
  playlistList: PlaylistListOptions;

  @ApiProperty({
    type: RatingListOptions,
    description: 'Rating list options',
    required: false
  })
  @Type(() => RatingListOptions)
  @IsOptional()
  @ValidateNested()
  ratingList: RatingListOptions;
}
