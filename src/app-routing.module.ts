import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';

import { AuthModule } from './resources/auth/auth.module';
import { UsersModule } from './resources/users/users.module';
import { RolesModule } from './resources/roles/roles.module';
import { SettingsModule } from './resources/settings/settings.module';
import { ExternalStoragesModule } from './resources/external-storages/external-storages.module';
import { MediaModule } from './resources/media/media.module';
import { MediaScannerModule } from './resources/media/media-scanner/media-scanner.module';

const routes: Routes = [
  {
    path: '/api',
    children: [
      {
        path: '/auth',
        module: AuthModule
      },
      {
        path: '/users',
        module: UsersModule
      },
      {
        path: '/roles',
        module: RolesModule
      },
      {
        path: '/settings',
        module: SettingsModule
      },
      {
        path: '/external-storages',
        module: ExternalStoragesModule
      },
      {
        path: '/media',
        module: MediaModule,
        children: [
          {
            path: '/scanner',
            module: MediaScannerModule
          }
        ]
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
    ExternalStoragesModule,
    MediaModule,
    MediaScannerModule
  ]
})
export class AppRoutingModule { }