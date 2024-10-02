import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class MediaProviderDto {
  @ApiProperty({
    type: String,
    description: 'Type of provider',
    enum: ['tmdb', 'tvdb']
  })
  @IsOptional()
  @IsIn(['tmdb', 'tvdb'])
  provider: string = 'tmdb';
}
