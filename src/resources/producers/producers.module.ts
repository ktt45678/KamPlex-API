import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Producer, ProducerSchema } from '../../schemas/producer.schema';
import { ProducersService } from './producers.service';
import { ProducersController } from './producers.controller';
import { ProducerExistConstraint } from '../../decorators/producer-exist.decorator';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    MongooseModule.forFeature([{ name: Producer.name, schema: ProducerSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [ProducersController],
  providers: [
    ProducerExistConstraint,
    ProducersService
  ],
  exports: [ProducersService]
})
export class ProducersModule { }
