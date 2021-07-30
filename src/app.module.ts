import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './resources/auth/auth.module';
import { UserModule } from './resources/user/user.module';

@Module({
  imports: [ConfigModule.forRoot(), AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
