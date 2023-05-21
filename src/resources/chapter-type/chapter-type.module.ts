import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChapterTypeService } from './chapter-type.service';
import { ChapterTypeController } from './chapter-type.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';
import { MongooseConnection } from '../../enums';
import { ChapterType, ChapterTypeSchema } from '../../schemas';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    WsAdminModule,
    MongooseModule.forFeature([{ name: ChapterType.name, schema: ChapterTypeSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [ChapterTypeController],
  providers: [ChapterTypeService],
  exports: [ChapterTypeService]
})
export class ChapterTypeModule { }
