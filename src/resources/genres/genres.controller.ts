import { Controller, Headers, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { FindGenresDto } from './dto/find-genres.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateGenresDto } from './dto/paginate-genres.dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { Paginated } from '../roles/entities/paginated.entity';
import { Genre } from './entities/genre.entity';
import { GenreDetails } from './entities/genre-details.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { UserPermission } from '../../enums';

@ApiTags('Genres')
@ApiExtraModels(Genre)
@Controller()
export class GenresController {
  constructor(private readonly genresService: GenresService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create genres if not exist (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new genres (single or array)', type: GenreDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto, authUser);
  }

  @Get()
  @ApiOperation({ summary: 'Find all genres' })
  @ApiOkResponse({
    description: 'Return a list of genres',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Genre) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Headers('Accept-Language') acceptLanguage: string, @Query() paginateGenresDto: PaginateGenresDto) {
    return this.genresService.findAll(paginateGenresDto, acceptLanguage);
  }

  @Get('all')
  @ApiOperation({ summary: 'Find all genres (without pagination)' })
  @ApiOkResponse({ description: 'Return a list of genres', type: [Genre] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllGenres(@Headers('Accept-Language') acceptLanguage: string, @Query() findGenresDto: FindGenresDto) {
    return this.genresService.findAllGenres(findGenresDto, acceptLanguage);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Get details of a genre' })
  @ApiOkResponse({ description: 'Return details of a genre', type: GenreDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  findOne(@Headers('Accept-Language') acceptLanguage: string, @Param('id') id: string) {
    return this.genresService.findOne(id, acceptLanguage);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update details of a genre (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated genre', type: GenreDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateGenreDto: UpdateGenreDto) {
    return this.genresService.update(id, updateGenreDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a genre (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Genre has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.genresService.remove(id, authUser);
  }
}
