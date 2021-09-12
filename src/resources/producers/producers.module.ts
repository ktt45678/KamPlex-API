import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Producer, ProducerSchema } from '../../schemas/producer.schema';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { ProducersService } from './producers.service';
import { ProducersController } from './producers.controller';
import { ProducerExistConstraint } from '../../decorators/producer-exist.decorator';

@Module({
  imports: [
    AuthModule,
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
