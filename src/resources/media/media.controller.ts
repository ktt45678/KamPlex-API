import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, ApiUnsupportedMediaTypeResponse, getSchemaPath } from '@nestjs/swagger';

import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto, AddMediaVideoDto, UpdateMediaVideoDto, AddMediaSourceDto, SaveMediaSourceDto, AddMediaChapterDto, AddTVEpisodeDto, FindTVEpisodesDto, UpdateMediaChapterDto, UpdateTVEpisodeDto, FindMediaDto, DeleteMediaVideosDto, DeleteMediaChaptersDto, DeleteMediaSubtitlesDto, OffsetPageMediaDto, CursorPageMediaDto, EncodeMediaSourceDto, AddLinkedMediaSourceDto, FindMediaStreamsDto } from './dto';
import { AuthUserDto } from '../users';
import { Media, MediaChapter, MediaDetails, MediaSubtitle, MediaUploadSession, MediaVideo, MediaStream, TVEpisode } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { UploadFileInterceptor, UploadImageInterceptor } from '../../common/interceptors';
import { ParseBigIntPipe } from '../../common/pipes';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { FileUpload } from '../../decorators/file-upload.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { UserPermission } from '../../enums';
import {
  UPLOAD_BACKDROP_MAX_SIZE, UPLOAD_BACKDROP_MIN_HEIGHT, UPLOAD_BACKDROP_MIN_WIDTH, UPLOAD_BACKDROP_RATIO,
  UPLOAD_MEDIA_IMAGE_TYPES, UPLOAD_SUBTITLE_TYPES, UPLOAD_POSTER_MAX_SIZE, UPLOAD_POSTER_MIN_HEIGHT, UPLOAD_POSTER_MIN_WIDTH,
  UPLOAD_POSTER_RATIO, UPLOAD_STILL_MAX_SIZE, UPLOAD_STILL_MIN_WIDTH, UPLOAD_STILL_MIN_HEIGHT, UPLOAD_STILL_RATIO,
  UPLOAD_SUBTITLE_MAX_SIZE
} from '../../config';
import { FastifyRequest } from 'fastify';

@ApiTags('Media')
@ApiExtraModels(Media)
@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a new movie or tv show (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new media', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() createMediaDto: CreateMediaDto) {
    return this.mediaService.create(createMediaDto, headers, authUser);
  }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all media (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of media',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Media) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() offsetPageMediaDto: OffsetPageMediaDto) {
    return this.mediaService.findAll(offsetPageMediaDto, headers, authUser);
  }

  @Get('cursor')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all media using cursor pagination (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
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
  findAllCursor(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() cursorPageMediaDto: CursorPageMediaDto) {
    return this.mediaService.findAllCursor(cursorPageMediaDto, headers, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Get details of a media (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a media, users with granted permissions can see more details', type: MediaDetails })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() findMediaDto: FindMediaDto) {
    return this.mediaService.findOne(id, headers, findMediaDto, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Update details of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated media', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(id, updateMediaDto, headers, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Media has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.remove(id, headers, authUser);
  }

  @Post(':id/videos')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Add a video (trailer/teaser) to an existing media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added videos', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() addMediaVideoDto: AddMediaVideoDto) {
    return this.mediaService.addMediaVideo(id, addMediaVideoDto, headers, authUser);
  }

  @Get(':id/videos')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Find all videos in a media (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of videos', type: [MediaVideo] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMediaVideos(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.findAllMediaVideos(id, headers, authUser);
  }

  @Patch(':id/videos/:video_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'video_id', type: String })
  @ApiOperation({ summary: `Update a video (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated videos', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  updateMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('video_id', ParseBigIntPipe) videoId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateMediaVideoDto: UpdateMediaVideoDto) {
    return this.mediaService.updateMediaVideo(id, videoId, updateMediaVideoDto, headers, authUser);
  }

  @Delete(':id/videos/:video_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'video_id', type: String })
  @ApiOperation({ summary: `Delete a video by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Video has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the video) could not be found', type: ErrorMessage })
  deleteMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('video_id', ParseBigIntPipe) videoId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMediaVideo(id, videoId, headers, authUser);
  }

  @Delete(':id/videos')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete multiple videos (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Videos have beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMediaVideos(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() deleteMediaVideosDto: DeleteMediaVideosDto) {
    return this.mediaService.deleteMediaVideos(id, deleteMediaVideosDto, headers, authUser);
  }

  @Patch(':id/poster')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_POSTER_MAX_SIZE,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    minWidth: UPLOAD_POSTER_MIN_WIDTH,
    minHeight: UPLOAD_POSTER_MIN_HEIGHT,
    ratio: UPLOAD_POSTER_RATIO,
    autoResize: true
  }))
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: `Upload media poster (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_POSTER_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_POSTER_MIN_WIDTH}x${UPLOAD_POSTER_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: ${UPLOAD_POSTER_RATIO.join(':')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Return poster url' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updatePoster(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.uploadMediaPoster(id, file, headers, authUser);
  }

  @Delete(':id/poster')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete the current poster of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Poster has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deletePoster(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMediaPoster(id, headers, authUser);
  }

  @Patch(':id/backdrop')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_BACKDROP_MAX_SIZE,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    minWidth: UPLOAD_BACKDROP_MIN_WIDTH,
    minHeight: UPLOAD_BACKDROP_MIN_HEIGHT,
    ratio: UPLOAD_BACKDROP_RATIO,
    autoResize: true
  }))
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: `Upload media backdrop (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_BACKDROP_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_BACKDROP_MIN_WIDTH}x${UPLOAD_BACKDROP_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: ${UPLOAD_BACKDROP_RATIO.join(':')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Return backdrop url' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateBackdrop(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.uploadMediaBackdrop(id, file, headers, authUser);
  }

  @Delete(':id/backdrop')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete the current backdrop of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Backdrop has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteBackdrop(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMediaBackdrop(id, headers, authUser);
  }

  @Post(':id/movie/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @UseInterceptors(new UploadFileInterceptor({
    maxSize: UPLOAD_SUBTITLE_MAX_SIZE,
    mimeTypes: UPLOAD_SUBTITLE_TYPES
  }))
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: `Upload a subtitle (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Subtitle format: WebVTT<br>
    Limit: ${UPLOAD_SUBTITLE_MAX_SIZE} Bytes<br/>
    Mime types: ${UPLOAD_SUBTITLE_TYPES.join(', ')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        file: { type: 'string', format: 'binary' },
        language: { type: 'string', description: 'Language of the subtitle (ISO6391)', example: 'en' }
      }
    }
  })
  @ApiOkResponse({ description: 'Return added subtitles' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateMovieSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.uploadMovieSubtitle(id, file, headers, authUser);
  }

  @Get(':id/movie/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Find all subtitles in a movie' })
  @ApiOkResponse({ description: 'Return a list of subtitles', type: [MediaSubtitle] })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMovieSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.mediaService.findAllMovieSubtitles(id, authUser);
  }

  @Delete(':id/movie/subtitles/:subtitle_id')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'subtitle_id', type: String })
  @ApiOperation({ summary: `Delete a subtitle of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitle has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMovieSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('subtitle_id', ParseBigIntPipe) subtitleId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMovieSubtitle(id, subtitleId, headers, authUser);
  }

  @Delete(':id/movie/subtitles')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete multiple subtitles (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitles have beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMovieSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() deleteMediaSubtitlesDto: DeleteMediaSubtitlesDto) {
    return this.mediaService.deleteMovieSubtitles(id, deleteMediaSubtitlesDto, headers, authUser);
  }

  @Post(':id/movie/source')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Create a session to upload the video source of a movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return upload session id and url', type: MediaUploadSession })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMovieSource(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() addMediaSourceDto: AddMediaSourceDto) {
    return this.mediaService.uploadMovieSource(id, addMediaSourceDto, authUser);
  }

  @Post(':id/movie/linked-source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Add a linked movie source (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been queued' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addLinkedMovieSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() addLinkedMediaSourceDto: AddLinkedMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.addLinkedMovieSource(id, addLinkedMediaSourceDto, baseUrl, authUser);
  }

  @Patch(':id/movie/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Encode a movie again from existing source (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been queued' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  encodeMovieSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() encodeMediaSourceDto: EncodeMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.encodeMovieSource(id, encodeMediaSourceDto, baseUrl, authUser);
  }

  @Post(':id/movie/source/:session_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'session_id', type: String })
  @ApiOperation({ summary: `Add a video source from a movie's finished upload session (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been added' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  saveMovieSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('session_id', ParseBigIntPipe) sessionId: bigint, @Body() saveMediaSourceDto: SaveMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.saveMovieSource(id, sessionId, saveMediaSourceDto, baseUrl, authUser);
  }

  @Delete(':id/movie/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete the source of a movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'The source has been deleted', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMovieSource(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMovieSource(id, headers, authUser);
  }

  @Get(':id/movie/streams')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Find streams of a movie' })
  @ApiCreatedResponse({ description: 'Return stream data', type: MediaStream })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findAllMovieStreams(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() findMediaStreamsDto: FindMediaStreamsDto) {
    return this.mediaService.findAllMovieStreams(id, findMediaStreamsDto, authUser);
  }

  @Post(':id/movie/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Add a chapter to an existing movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added chapters', type: [MediaChapter] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() addMediaChapterDto: AddMediaChapterDto) {
    return this.mediaService.addMovieChapter(id, addMediaChapterDto, headers, authUser);
  }

  @Get(':id/movie/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Find all chapters in a movie, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of chapters', type: [MediaChapter] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMovieChapters(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.findAllMovieChapters(id, headers, authUser);
  }

  @Patch(':id/movie/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'chapter_id', type: String })
  @ApiOperation({ summary: `Update a chapter (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated chapters', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the chapter) could not be found', type: ErrorMessage })
  updateMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('chapter_id', ParseBigIntPipe) chapterId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateMediaChapterDto: UpdateMediaChapterDto) {
    return this.mediaService.updateMovieChapter(id, chapterId, updateMediaChapterDto, headers, authUser);
  }

  @Delete(':id/movie/chapters/:chapter_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'chapter_id', type: String })
  @ApiOperation({ summary: `Delete a chapter by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Chapter has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the chapter) could not be found', type: ErrorMessage })
  deleteMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('chapter_id', ParseBigIntPipe) chapterId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteMovieChapter(id, chapterId, headers, authUser);
  }

  @Delete(':id/movie/chapters')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete multiple chapters (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Chapters have been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMovieChapters(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() deleteMediaChaptersDto: DeleteMediaChaptersDto) {
    return this.mediaService.deleteMovieChapters(id, deleteMediaChaptersDto, headers, authUser);
  }

  @Post(':id/tv/episodes')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Add a new episode for a tv show (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new episode', type: TVEpisode })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  addTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() addTVEpisodeDto: AddTVEpisodeDto) {
    return this.mediaService.addTVEpisode(id, addTVEpisodeDto, headers, authUser);
  }

  @Get(':id/tv/episodes')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Find all episodes from a tv show' })
  @ApiOkResponse({ description: 'Return all episodes from a tv show', type: [TVEpisode] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllTVEpisodes(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Query() findEpisodesDto: FindTVEpisodesDto, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.findAllTVEpisodes(id, findEpisodesDto, headers, authUser);
  }

  @Get(':id/tv/episodes/:episode_id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Get details of an episode (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return an episode', type: MediaDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  findOneTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.findOneTVEpisode(id, episodeId, headers, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Update an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated episode', type: TVEpisode })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  updateTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateTVEpisodeDto: UpdateTVEpisodeDto) {
    return this.mediaService.updateTVEpisode(id, episodeId, updateTVEpisodeDto, headers, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Delete an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Episode has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteTVEpisode(id, episodeId, headers, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id/still')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_STILL_MAX_SIZE,
    minWidth: UPLOAD_STILL_MIN_WIDTH,
    minHeight: UPLOAD_STILL_MIN_HEIGHT,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    ratio: UPLOAD_STILL_RATIO,
    autoResize: true
  }))
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({
    summary: `Upload episode still image (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_STILL_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_STILL_MIN_WIDTH}x${UPLOAD_STILL_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: ${UPLOAD_STILL_RATIO.join(':')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Return still url' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateTVEpisodeStill(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.uploadTVEpisodeStill(id, episodeId, file, headers, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/still')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Delete the current episode still image (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Still image has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteTVEpisodeStill(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteTVEpisodeStill(id, episodeId, headers, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @UseInterceptors(new UploadFileInterceptor({
    maxSize: UPLOAD_SUBTITLE_MAX_SIZE,
    mimeTypes: UPLOAD_SUBTITLE_TYPES
  }))
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({
    summary: `Upload a subtitle (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Subtitle format: WebVTT<br>
    Limit: ${UPLOAD_SUBTITLE_MAX_SIZE} Bytes<br/>
    Mime types: ${UPLOAD_SUBTITLE_TYPES.join(', ')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        file: { type: 'string', format: 'binary' },
        language: { type: 'string', description: 'Language of the subtitle (ISO6391)', example: 'en' }
      }
    }
  })
  @ApiOkResponse({ description: 'Return added subtitles' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateTVEpisodeSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @FileUpload() file: Storage.MultipartFile, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.uploadTVEpisodeSubtitle(id, episodeId, file, headers, authUser);
  }

  @Get(':id/tv/episodes/:episode_id/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: 'Find all subtitles in a movie' })
  @ApiOkResponse({ description: 'Return a list of subtitles', type: [MediaSubtitle] })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The episode is private', type: ErrorMessage })
  findAllTVEpisodeSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint) {
    return this.mediaService.findAllTVEpisodeSubtitles(id, episodeId, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/subtitles/:subtitle_id')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiParam({ name: 'subtitle_id', type: String })
  @ApiOperation({ summary: `Delete a subtitle of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitle has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteTVSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Param('subtitle_id', ParseBigIntPipe) subtitleId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteTVEpisodeSubtitle(id, episodeId, subtitleId, headers, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/subtitles')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Delete multiple subtitles (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitles have beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteTVSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() deleteMediaSubtitlesDto: DeleteMediaSubtitlesDto) {
    return this.mediaService.deleteTVEpisodeSubtitles(id, episodeId, deleteMediaSubtitlesDto, headers, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/source')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Create a session to upload the video source of a tv episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return upload session id and url', type: MediaUploadSession })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addTVEpisodeSource(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Body() addMediaSourceDto: AddMediaSourceDto) {
    return this.mediaService.uploadTVEpisodeSource(id, episodeId, addMediaSourceDto, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/linked-source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Add a linked episode source (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been queued' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addLinkedTVEpisodeSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Body() addLinkedMediaSourceDto: AddLinkedMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.addLinkedTVEpisodeSource(id, episodeId, addLinkedMediaSourceDto, baseUrl, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Encode a tv episode again from existing source (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been queued' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  encodeTVEpisodeSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Body() encodeMediaSourceDto: EncodeMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.encodeTVEpisodeSource(id, episodeId, encodeMediaSourceDto, baseUrl, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/source/:session_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiParam({ name: 'session_id', type: String })
  @ApiOperation({ summary: `Add a video source from a tv episode's finished upload session (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been added' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  saveTVEpisodeSource(@Req() req: FastifyRequest, @AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Param('session_id', ParseBigIntPipe) sessionId: bigint, @Body() saveMediaSourceDto: SaveMediaSourceDto) {
    const baseUrl = req.protocol + '://' + req.hostname;
    return this.mediaService.saveTVEpisodeSource(id, episodeId, sessionId, saveMediaSourceDto, baseUrl, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Delete the source of an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'The source has been deleted', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteTVEpisodeSource(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteTVEpisodeSource(id, episodeId, headers, authUser);
  }

  @Get(':id/tv/episodes/:episode_number/streams')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_number', type: String })
  @ApiOperation({ summary: 'Find streams of an episode' })
  @ApiCreatedResponse({ description: 'Return stream data', type: MediaStream })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'This episode is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findAllTVEpisodeStreams(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_number') episodeNumber: string, @Query() findMediaStreamsDto: FindMediaStreamsDto) {
    return this.mediaService.findAllTVEpisodeStreams(id, +episodeNumber, findMediaStreamsDto, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Add a chapter to an existing episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added chapters', type: [MediaChapter] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  addTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() addMediaChapterDto: AddMediaChapterDto) {
    return this.mediaService.addTVEpisodeChapter(id, episodeId, addMediaChapterDto, headers, authUser);
  }

  @Get(':id/tv/episodes/:episode_id/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Find all chapters in an episode, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of chapters', type: [MediaChapter] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The episode is private', type: ErrorMessage })
  findAllTVEpisodeChapters(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.findAllTVEpisodeChapters(id, episodeId, headers, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiParam({ name: 'chapter_id', type: String })
  @ApiOperation({ summary: `Update a chapter (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated chapters', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode (or the chapter) could not be found', type: ErrorMessage })
  updateTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Param('chapter_id', ParseBigIntPipe) chapterId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateMediaChapterDto: UpdateMediaChapterDto) {
    return this.mediaService.updateTVEpisodeChapter(id, episodeId, chapterId, updateMediaChapterDto, headers, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/chapters/:chapter_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiParam({ name: 'chapter_id', type: String })
  @ApiOperation({ summary: `Delete a chapter by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Chapter has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode (or the chapter) could not be found', type: ErrorMessage })
  deleteTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @Param('chapter_id', ParseBigIntPipe) chapterId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.mediaService.deleteTVEpisodeChapter(id, episodeId, chapterId, headers, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/chapters')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'episode_id', type: String })
  @ApiOperation({ summary: `Delete a chapter by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Chapters have been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode (or the chapter) could not be found', type: ErrorMessage })
  deleteTVEpisodeChapters(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Param('episode_id', ParseBigIntPipe) episodeId: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() deleteMediaChaptersDto: DeleteMediaChaptersDto) {
    return this.mediaService.deleteTVEpisodeChapters(id, episodeId, deleteMediaChaptersDto, headers, authUser);
  }
}
