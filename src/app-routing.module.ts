import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';

import { AuthModule } from './resources/auth/auth.module';
import { UsersModule } from './resources/users/users.module';
import { RolesModule } from './resources/roles/roles.module';
import { SettingsModule } from './resources/settings/settings.module';
import { MediaModule } from './resources/media/media.module';

const routes: Routes = [
  {
    path: '/api',
    children: [
      {
        path: '/',
        module: AuthModule
      },
      {
        path: '/',
        module: UsersModule
      },
      {
        path: '/',
        module: RolesModule
      },
      {
        path: '/',
        module: SettingsModule
      },
      {
        path: '/',
        module: MediaModule
      }
    ]
  }
];

@Module({
  imports: [
    RouterModule.register(routes),
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
    MediaModule
  ]
})
export class AppRoutingModule { }