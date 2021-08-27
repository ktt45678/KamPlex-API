import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppRoutingModule } from './app-routing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseConnection } from './enums/mongoose-connection.enum';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true,
      connectionName: MongooseConnection.DATABASE_A
    }),
    AppRoutingModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
