import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Production, ProductionSchema } from '../../schemas';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { ProductionExistConstraint } from '../../decorators/production-exist.decorator';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    MongooseModule.forFeature([{ name: Production.name, schema: ProductionSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [ProductionsController],
  providers: [
    ProductionExistConstraint,
    ProductionsService
  ],
  exports: [ProductionsService]
})
export class ProductionsModule { }
