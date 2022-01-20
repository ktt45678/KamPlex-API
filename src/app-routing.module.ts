import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';

import { AuthModule } from './resources/auth/auth.module';
import { UsersModule } from './resources/users/users.module';
import { RolesModule } from './resources/roles/roles.module';
import { SettingsModule } from './resources/settings/settings.module';
import { ExternalStoragesModule } from './resources/external-storages/external-storages.module';
import { MediaModule } from './resources/media/media.module';
import { GenresModule } from './resources/genres/genres.module';
import { ProducersModule } from './resources/producers/producers.module';
import { RatingsModule } from './resources/ratings/ratings.module';
import { HistoryModule } from './resources/history/history.module';
import { PlaylistsModule } from './resources/playlists/playlists.module';
import { NotificationModule } from './resources/notification/notification.module';
import { AuditLogModule } from './resources/audit-log/audit-log.module';

const routes: Routes = [
  {
    path: '/api',
    children: [
      {
        path: '/audit-log',
        module: AuditLogModule
      },
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
        module: MediaModule
      },
      {
        path: '/notification',
        module: NotificationModule
      },
      {
        path: '/genres',
        module: GenresModule
      },
      {
        path: '/producers',
        module: ProducersModule
      },
      {
        path: '/ratings',
        module: RatingsModule
      },
      {
        path: '/history',
        module: HistoryModule
      },
      {
        path: '/playlists',
        module: PlaylistsModule
      }
    ]
  }
];

@Module({
  imports: [
    RouterModule.register(routes),
    AuditLogModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
    ExternalStoragesModule,
    MediaModule,
    NotificationModule,
    GenresModule,
    ProducersModule,
    RatingsModule,
    HistoryModule,
    PlaylistsModule
  ]
})
export class AppRoutingModule { }