import { forwardRef, Module } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenresController } from './genres.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Genre, GenreSchema } from '../../schemas/genre.schema';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { GenreExistConstraint } from '../../decorators/genre-exist.decorator';

@Module({
  imports: [
    AuthModule,
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
