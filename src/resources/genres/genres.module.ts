import { forwardRef, Module } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenresController } from './genres.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MediaModule } from '../media/media.module';
import { Genre, GenreSchema } from '../../schemas/genre.schema';
import { GenreExistConstraint } from '../../decorators/genre-exist.decorator';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    forwardRef(() => MediaModule),
    MongooseModule.forFeature([{ name: Genre.name, schema: GenreSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [GenresController],
  providers: [
    GenresService,
    GenreExistConstraint
  ],
  exports: [GenresService]
})
export class GenresModule { }
