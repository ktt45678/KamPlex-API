import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { History, HistorySchema } from '../../schemas';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => MediaModule),
    MongooseModule.forFeature([{ name: History.name, schema: HistorySchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService]
})
export class HistoryModule { }
