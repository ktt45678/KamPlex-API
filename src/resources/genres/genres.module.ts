import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GenresService } from './genres.service';
import { GenresController } from './genres.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MediaModule } from '../media/media.module';
import { Genre, GenreSchema } from '../../schemas';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    MongooseModule.forFeature([{ name: Genre.name, schema: GenreSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService]
})
export class GenresModule { }
