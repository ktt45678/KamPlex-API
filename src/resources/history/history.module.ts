import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { History, HistorySchema } from '../../schemas/history.schema';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: History.name, schema: HistorySchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService]
})
export class HistoryModule { }
