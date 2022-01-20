import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AzureBlobService } from './azure-blob.service';

@Module({
  imports: [HttpModule],
  providers: [AzureBlobService],
  exports: [AzureBlobService]
})
export class AzureBlobModule {}
