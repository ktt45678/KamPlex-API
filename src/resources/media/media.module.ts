import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ImgurModule } from '../../common/imgur/imgur.module';

@Module({
  imports: [ImgurModule],
  controllers: [MediaController],
  providers: [MediaService]
})
export class MediaModule {}
