import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { FindGenreDto } from './dto/find-genre.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateGenresDto } from './dto/paginate-genres.dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { UserPermission } from '../../enums/user-permission.enum';
import { Paginated } from '../roles/entities/paginated.entity';
import { Genre } from './entities/genre.entity';
import { GenreDetails } from './entities/genre-details.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';

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
  @ApiBearerAuth()
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
  findAll(@Query() paginateGenresDto: PaginateGenresDto) {
    return this.genresService.findAll(paginateGenresDto);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Get details of a genre' })
  @ApiOkResponse({ description: 'Return details of a genre', type: GenreDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  findOne(@Param('id') id: string, @Query() findGenreDto: FindGenreDto) {
    return this.genresService.findOne(id, findGenreDto);
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
  update(@Param('id') id: string, @Body() updateGenreDto: UpdateGenreDto) {
    return this.genresService.update(id, updateGenreDto);
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
  remove(@Param('id') id: string) {
    return this.genresService.remove(id);
  }
}
