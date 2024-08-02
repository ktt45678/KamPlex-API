import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { CloudflareR2Service } from './cloudflare-r2.service';

@Module({
  imports: [HttpModule],
  providers: [CloudflareR2Service],
  exports: [CloudflareR2Service]
})
export class CloudflareR2Module {}
