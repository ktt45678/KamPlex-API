import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { MongooseConnection } from '../../enums';
import { MediaTag, MediaTagSchema } from '../../schemas';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    WsAdminModule,
    MongooseModule.forFeature([{ name: MediaTag.name, schema: MediaTagSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService]
})
export class TagsModule { }
