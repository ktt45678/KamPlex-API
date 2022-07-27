import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ImagekitService } from './imagekit.service';

@Module({
  imports: [HttpModule],
  providers: [ImagekitService],
  exports: [ImagekitService]
})
export class ImagekitModule { }
