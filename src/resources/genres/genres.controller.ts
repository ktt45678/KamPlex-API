import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { GenresService } from './genres.service';
import { CreateGenreDto, FindGenresDto, UpdateGenreDto, PaginateGenresDto, RemoveGenresDto, CursorPageGenresDto } from './dto';
import { AuthUserDto } from '../users';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { Genre, GenreDetails } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
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
  create(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto, headers, authUser);
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
  findAll(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() paginateGenresDto: PaginateGenresDto) {
    return this.genresService.findAll(paginateGenresDto, headers, authUser);
  }

  @Get('cursor')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all genres using cursor pagination, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of genres',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Genre) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllCursor(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() cursorPageGenresDto: CursorPageGenresDto) {
    return this.genresService.findAllCursor(cursorPageGenresDto, headers, authUser);
  }

  @Get('all')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all genres (without pagination), (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of genres', type: [Genre] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllNoPage(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() findGenresDto: FindGenresDto) {
    return this.genresService.findAllNoPage(findGenresDto, headers, authUser);
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
  findOne(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id') id: string) {
    return this.genresService.findOne(id, headers, authUser);
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
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateGenreDto: UpdateGenreDto) {
    return this.genresService.update(id, updateGenreDto, headers, authUser);
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
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.genresService.remove(id, headers, authUser);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete multiple genres (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Genres have been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  removeMany(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() removeGenresDto: RemoveGenresDto) {
    return this.genresService.removeMany(removeGenresDto, headers, authUser);
  }
}
