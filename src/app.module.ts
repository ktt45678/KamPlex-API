import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { AppRoutingModule } from './app-routing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseConnection } from './enums/mongoose-connection.enum';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    }),
    MongooseModule.forRoot(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true,
      connectionName: MongooseConnection.DATABASE_A
    }),
    BullModule.forRoot({
      redis: <any>process.env.REDIS_QUEUE_URL
    }),
    AppRoutingModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
