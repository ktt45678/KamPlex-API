import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { HttpEmailService } from './http-email.service';

@Module({
  imports: [HttpModule],
  providers: [HttpEmailService],
  exports: [HttpEmailService]
})
export class HttpEmailModule { }
