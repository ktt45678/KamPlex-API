import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WsAdminGateway } from './ws-admin.gateway';

@Module({
  imports: [AuthModule],
  providers: [WsAdminGateway],
  exports: [WsAdminGateway]
})
export class WsAdminModule { }
