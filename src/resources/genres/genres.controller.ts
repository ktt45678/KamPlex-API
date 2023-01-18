import { Controller, Headers, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { GenresService } from './genres.service';
import { CreateGenreDto, FindGenresDto, UpdateGenreDto, PaginateGenresDto, RemoveGenresDto } from './dto';
import { AuthUserDto } from '../users';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { Genre, GenreDetails } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { Paginated } from '../../common/entities';
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
  @ApiOperation({ summary: `Create a genre if not exist (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Returns new genre', type: GenreDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto, authUser);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all genres, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
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
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() paginateGenresDto: PaginateGenresDto) {
    return this.genresService.findAll(paginateGenresDto, acceptLanguage, authUser);
  }

  @Get('all')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all genres (without pagination), (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of genres', type: [Genre] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllGenres(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() findGenresDto: FindGenresDto) {
    return this.genresService.findAllGenres(findGenresDto, acceptLanguage, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get details of a genre, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return details of a genre', type: GenreDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Param('id') id: string) {
    return this.genresService.findOne(id, acceptLanguage, authUser);
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

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a genre (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Genre has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The genre could not be found', type: ErrorMessage })
  removeMany(@AuthUser() authUser: AuthUserDto, @Query() removeGenresDto: RemoveGenresDto) {
    return this.genresService.removeMany(removeGenresDto, authUser);
  }
}
