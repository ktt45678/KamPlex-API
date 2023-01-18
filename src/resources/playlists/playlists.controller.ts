import { Controller, Get, Headers, Post, Body, Param, Delete, UseGuards, Query, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { PlaylistsService } from './playlists.service';
import { AddPlaylistItemDto, CreatePlaylistDto, FindAddToPlaylistDto, CursorPagePlaylistItemsDto, CursorPagePlaylistsDto } from './dto';
import { Playlist, PlaylistItem, PlaylistToAdd } from './entities';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { Media } from '../media';
import { UserPermission } from '../../enums';
import { CursorPaginated } from '../../common/entities';

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
  @ApiOperation({ summary: 'Get details of a playlist' })
  @ApiOkResponse({ description: 'Return a playlist details', type: Playlist })
  @ApiNotFoundResponse({ description: 'Playlist not found' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.playlistsService.findOne(id, authUser);
  }

  @Post(':id/items')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a media to a playlist' })
  @ApiCreatedResponse({ description: 'Successfully added', type: PlaylistItem })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  addPlaylistMedia(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() addPlaylistMediaDto: AddPlaylistItemDto, @Headers('Accept-Language') acceptLanguage: string) {
    return this.playlistsService.addItem(id, addPlaylistMediaDto, acceptLanguage, authUser);
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
  findAllItems(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Param('id') id: string, @Query() findPlaylistItemsDto: CursorPagePlaylistItemsDto) {
    return this.playlistsService.findAllItems(id, findPlaylistItemsDto, acceptLanguage, authUser);
  }

  @Delete(':id/items/:item_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a media from your playlist' })
  @ApiNoContentResponse({ description: 'Successfully removed' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  removePlaylistItem(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('item_id') itemId: string) {
    return this.playlistsService.removeItem(id, itemId, authUser);
  }
}
