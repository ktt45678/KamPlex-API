import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WsAdminModule } from '../ws-admin/ws-admin.module';
import { Production, ProductionSchema } from '../../schemas';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    WsAdminModule,
    MongooseModule.forFeature([{ name: Production.name, schema: ProductionSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [ProductionsController],
  providers: [ProductionsService],
  exports: [ProductionsService]
})
export class ProductionsModule { }
