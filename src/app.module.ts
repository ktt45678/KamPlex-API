import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { AppRoutingModule } from './app-routing.module';
import { AppSocketModule } from './app-socket.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './common/dto/env-validation.dto';
import { MongooseConnection } from './enums';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL')
      }),
      connectionName: MongooseConnection.DATABASE_A,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL_B')
      }),
      connectionName: MongooseConnection.DATABASE_B,
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        url: configService.get<string>('REDIS_QUEUE_URL')
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AppRoutingModule,
    AppSocketModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
