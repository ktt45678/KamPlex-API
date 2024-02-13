import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class MediaImageItem {
  @ApiProperty()
  aspectRatio: number;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  filePath: string;

  @ApiProperty()
  height: number;

  @ApiProperty()
  width: number;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fileUrl(): string {
    return `https://image.tmdb.org/t/p/original${this.filePath}`;
  }
}
