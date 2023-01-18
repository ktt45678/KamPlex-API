import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';

import { AuthModule } from './resources/auth/auth.module';
import { UsersModule } from './resources/users/users.module';
import { RolesModule } from './resources/roles/roles.module';
import { SettingsModule } from './resources/settings/settings.module';
import { ExternalStoragesModule } from './resources/external-storages/external-storages.module';
import { MediaModule } from './resources/media/media.module';
import { GenresModule } from './resources/genres/genres.module';
import { ProductionsModule } from './resources/productions/productions.module';
import { CollectionModule } from './resources/collection/collection.module';
import { TagsModule } from './resources/tags/tags.module';
import { RatingsModule } from './resources/ratings/ratings.module';
import { HistoryModule } from './resources/history/history.module';
import { PlaylistsModule } from './resources/playlists/playlists.module';
import { NotificationModule } from './resources/notification/notification.module';
import { AuditLogModule } from './resources/audit-log/audit-log.module';
import { MediaScannerModule } from './resources/media-scanner/media-scanner.module';

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
        path: '/productions',
        module: ProductionsModule
      },
      {
        path: '/collections',
        module: CollectionModule
      },
      {
        path: '/tags',
        module: TagsModule
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
      },
      {
        path: '/media-scanner',
        module: MediaScannerModule
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
    ProductionsModule,
    CollectionModule,
    TagsModule,
    RatingsModule,
    HistoryModule,
    PlaylistsModule,
    MediaScannerModule
  ]
})
export class AppRoutingModule { }
