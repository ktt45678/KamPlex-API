import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { Counter, CounterSchema } from '../../schemas/counter.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }], MongooseConnection.DATABASE_A)],
  exports: [MongooseModule]
})
export class MongooseCounterModule { }
