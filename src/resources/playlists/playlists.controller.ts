import { Controller, Headers, Get, Post, Body, Param, Delete, UseGuards, Query, HttpCode, Res, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto, PaginatePlaylistDto } from './dto';
import { Playlist, PlaylistItem } from './entities';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { Paginated } from '../roles';

@ApiTags('Playlists')
@ApiExtraModels(Playlist)
@Controller()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a media to your playlist' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View your playlist' })
  @ApiOkResponse({
    description: 'Return a list of media in your playlist',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Playlist) } } } }
      ]
    }
  })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() paginatePlaylistDto: PaginatePlaylistDto) {
    return this.playlistsService.findAll(paginatePlaylistDto, acceptLanguage, authUser);
  }

  @Get('media/:media_id')
  @UseGuards(AuthGuard)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if a media exists in your playlist (optional auth)' })
  @ApiOkResponse({ description: 'The media exists in your playlist', type: PlaylistItem })
  @ApiNoContentResponse({ description: 'The media does not exists in your playlist or you are not logged in' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  async findOnePlaylistMedia(@Res() res: FastifyReply, @AuthUser() authUser: AuthUserDto, @Param('media_id') mediaId: string) {
    const result = await this.playlistsService.findOnePlaylistMedia(mediaId, authUser);
    if (!result)
      return res.status(204).send();
    res.status(200).send(result);
  }

  @Delete('media/:media_id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a media from your playlist' })
  @ApiNoContentResponse({ description: 'Successfully removed' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  removePlaylistMedia(@AuthUser() authUser: AuthUserDto, @Param('media_id') mediaId: string) {
    return this.playlistsService.removePlaylistMedia(mediaId, authUser);
  }
}
