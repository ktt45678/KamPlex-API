import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { MediaCollection, MediaCollectionSchema } from '../../schemas';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AzureBlobModule } from '../../common/modules/azure-blob/azure-blob.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    AzureBlobModule,
    WsAdminModule,
    MongooseModule.forFeature([{ name: MediaCollection.name, schema: MediaCollectionSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService]
})
export class CollectionModule { }
