import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { parseRedisUrl } from 'parse-redis-url-simple';

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
        uri: configService.get<string>('DATABASE_URL'),
        family: 4,
        useBigInt64: true
      }),
      connectionName: MongooseConnection.DATABASE_A,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL_B'),
        family: 4,
        useBigInt64: true
      }),
      connectionName: MongooseConnection.DATABASE_B,
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const [parsedUrl] = parseRedisUrl(configService.get<string>('REDIS_QUEUE_URL'));
        return {
          connection: {
            host: parsedUrl.host,
            port: parsedUrl.port,
            password: parsedUrl.password,
            db: +parsedUrl.database,
            enableOfflineQueue: false
          }
        };
      },
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
