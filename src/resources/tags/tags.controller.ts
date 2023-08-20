import { Controller, Get, Post, Body, Patch, Param, Delete, ClassSerializerInterceptor, HttpCode, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiBadRequestResponse, getSchemaPath, ApiNotFoundResponse, ApiNoContentResponse, ApiExtraModels, ApiTags, ApiParam } from '@nestjs/swagger';

import { TagsService } from './tags.service';
import { CreateTagDto, CursorPageMediaDto, CursorPageTagsDto, PaginateTagsDto, RemoveTagsDto, UpdateTagDto } from './dto';
import { AuthUserDto } from '../users';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { Tag, TagDetails } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { Media } from '../media';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { ParseBigIntPipe } from '../../common/pipes';
import { UserPermission } from '../../enums';

@ApiTags('Tags')
@ApiExtraModels(Tag)
@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a tag if not exist (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Returns new tag', type: TagDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto, headers, authUser);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all tags, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of tags',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Tag) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() paginateTagsDto: PaginateTagsDto) {
    return this.tagsService.findAll(paginateTagsDto, headers, authUser);
  }

  @Get('cursor')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all tags using cursor pagination, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of tags',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Tag) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllCursor(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() cursorPageTagsDto: CursorPageTagsDto) {
    return this.tagsService.findAllCursor(cursorPageTagsDto, headers, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Get details of a tag, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return details of a tag', type: TagDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The tag could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.tagsService.findOne(id, headers, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Update details of a tag (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated tag', type: TagDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The tag could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updateTagDto: UpdateTagDto, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.tagsService.update(id, updateTagDto, headers, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete a tag (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Tag has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The tag could not be found', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.tagsService.remove(id, headers, authUser);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete multiple tags (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Tags have been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  removeMany(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() removeTagsDto: RemoveTagsDto) {
    return this.tagsService.removeMany(removeTagsDto, headers, authUser);
  }

  @Get(':id/media')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Find all media in a tag using cursor pagination, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of media',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Media) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllMedia(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() cursorPageMediaDto: CursorPageMediaDto) {
    return this.tagsService.findAllMedia(id, cursorPageMediaDto, headers, authUser);
  }
}
