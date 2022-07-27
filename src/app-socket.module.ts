import { Module } from '@nestjs/common';

import { WsAdminModule } from './resources/ws-admin/ws-admin.module';

@Module({
  imports: [
    WsAdminModule
  ]
})
export class AppSocketModule { }
