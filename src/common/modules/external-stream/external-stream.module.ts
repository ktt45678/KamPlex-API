import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalStreamService } from './external-stream.service';

@Module({
  imports: [HttpModule],
  providers: [ExternalStreamService],
  exports: [ExternalStreamService]
})
export class ExternalStreamModule { }
