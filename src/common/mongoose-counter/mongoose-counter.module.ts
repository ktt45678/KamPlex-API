import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Counter, CounterSchema } from '../../schemas/counter.schema';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }], MongooseConnection.DATABASE_A)],
  exports: [MongooseModule]
})
export class MongooseCounterModule { }
