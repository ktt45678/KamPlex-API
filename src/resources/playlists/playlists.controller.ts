import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, HttpCode, UseInterceptors, ClassSerializerInterceptor, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, ApiUnsupportedMediaTypeResponse, getSchemaPath } from '@nestjs/swagger';

import { PlaylistsService } from './playlists.service';
import { AddPlaylistItemDto, CreatePlaylistDto, FindAddToPlaylistDto, CursorPagePlaylistItemsDto, CursorPagePlaylistsDto, DeletePlaylistItemDto, UpdatePlaylistDto, AddAllPlaylistItemsDto } from './dto';
import { Playlist, PlaylistItem, PlaylistToAdd } from './entities';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { RateLimitOptions } from '../../decorators/rate-limit-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { FileUpload } from '../../decorators/file-upload.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { Media } from '../media';
import { UserPermission } from '../../enums';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated } from '../../common/entities';
import { RateLimitInterceptor, UploadImageInterceptor } from '../../common/interceptors';
import { ParseBigIntPipe } from '../../common/pipes';
import {
  UPLOAD_PLAYLIST_THUMBNAIL_MAX_SIZE, UPLOAD_PLAYLIST_THUMBNAIL_MIN_HEIGHT, UPLOAD_PLAYLIST_THUMBNAIL_MIN_WIDTH,
  UPLOAD_PLAYLIST_THUMBNAIL_RATIO, UPLOAD_PLAYLIST_THUMBNAIL_TYPES
} from '../../config';

@ApiTags('Playlists')
@ApiExtraModels(Playlist)
@Controller()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a playlist' })
  @ApiCreatedResponse({ description: 'Successfully added', type: PlaylistItem })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createPlaylistDto: CreatePlaylistDto) {
    return this.playlistsService.create(createPlaylistDto, authUser);
  }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View your playlists' })
  @ApiOkResponse({
    description: 'Return a list of media in your playlist',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Playlist) } } } }
      ]
    }
  })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Query() cursorPaginatePlaylistDto: CursorPagePlaylistsDto) {
    return this.playlistsService.findAll(cursorPaginatePlaylistDto, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Get details of a playlist' })
  @ApiOkResponse({ description: 'Return a playlist details', type: Playlist })
  @ApiNotFoundResponse({ description: 'Playlist not found' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.playlistsService.findOne(id, authUser);
  }

  @Patch(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Update details of a playlist' })
  @ApiOkResponse({ description: 'Return updated playlist', type: Playlist })
  @ApiNotFoundResponse({ description: 'Playlist not found' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updatePlaylistDto: UpdatePlaylistDto) {
    return this.playlistsService.update(id, updatePlaylistDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Delete a playlist' })
  @ApiOkResponse({ description: 'Playlist has been deleted', type: Playlist })
  @ApiNotFoundResponse({ description: 'Playlist not found' })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.playlistsService.remove(id, authUser);
  }

  @Patch(':id/thumbnail')
  @UseGuards(AuthGuard)
  @UseInterceptors(RateLimitInterceptor, ClassSerializerInterceptor, new UploadImageInterceptor({
    maxSize: UPLOAD_PLAYLIST_THUMBNAIL_MAX_SIZE,
    mimeTypes: UPLOAD_PLAYLIST_THUMBNAIL_TYPES,
    minWidth: UPLOAD_PLAYLIST_THUMBNAIL_MIN_WIDTH,
    minHeight: UPLOAD_PLAYLIST_THUMBNAIL_MIN_HEIGHT,
    ratio: UPLOAD_PLAYLIST_THUMBNAIL_RATIO,
    autoResize: true
  }))
  @RateLimitOptions({ catchMode: 'success', ttl: 600, limit: 3 })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: 'Upload playlist thumbnail',
    description: `Limit: ${UPLOAD_PLAYLIST_THUMBNAIL_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_PLAYLIST_THUMBNAIL_MIN_WIDTH}x${UPLOAD_PLAYLIST_THUMBNAIL_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_PLAYLIST_THUMBNAIL_TYPES.join(', ')}<br/>Aspect ratio: ${UPLOAD_PLAYLIST_THUMBNAIL_RATIO.join(':')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Return thumbnail url' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateThumbnail(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @FileUpload() file: Storage.MultipartFile) {
    return this.playlistsService.uploadThumbnail(id, file, authUser);
  }

  @Delete(':id/thumbnail')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Delete the current thumbnail of a playlist' })
  @ApiNoContentResponse({ description: 'Thumbnail has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  deleteThumbnail(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.playlistsService.deleteThumbnail(id, authUser);
  }

  @Post(':id/items')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Add a media to a playlist' })
  @ApiCreatedResponse({ description: 'Successfully added', type: PlaylistItem })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The playlist or media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  addPlaylistMedia(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() addPlaylistMediaDto: AddPlaylistItemDto, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.playlistsService.addItem(id, addPlaylistMediaDto, headers, authUser);
  }

  @Post(':id/all_items')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Add all a media from a playlist to a selected playlist' })
  @ApiNoContentResponse({ description: 'Successfully added', type: PlaylistItem })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The playlist could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  addAllPlaylistMedia(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() addAllPlaylistItemsDto: AddAllPlaylistItemsDto) {
    return this.playlistsService.addAllItems(id, addAllPlaylistItemsDto, authUser);
  }

  @Get('add_to_playlist')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get playlists for adding media' })
  @ApiOkResponse({ description: 'Return all playlists', type: [PlaylistToAdd] })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAddToPlaylist(@AuthUser() authUser: AuthUserDto, @Query() findAddToPlaylistDto: FindAddToPlaylistDto) {
    return this.playlistsService.findAddToPlaylist(findAddToPlaylistDto, authUser);
  }

  @Get(':id/items')
  @UseGuards(AuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Get playlist items (optional auth)' })
  @ApiOkResponse({
    description: 'Return all playlist items',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        {
          properties: {
            results: { type: 'array', items: { $ref: getSchemaPath(PlaylistItem) } },
            mediaList: { type: 'array', items: { $ref: getSchemaPath(Media) } },
            itemCount: { type: 'number' }
          }
        }
      ]
    }
  })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAllItems(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() findPlaylistItemsDto: CursorPagePlaylistItemsDto) {
    return this.playlistsService.findAllItems(id, findPlaylistItemsDto, headers, authUser);
  }

  @Delete(':id/items')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Remove a media from your playlist' })
  @ApiNoContentResponse({ description: 'Successfully removed' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  removePlaylistItem(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() deletePlaylistItemDto: DeletePlaylistItemDto) {
    return this.playlistsService.removeItem(id, deletePlaylistItemDto, authUser);
  }
}
