import { Controller, Get, Headers, Post, Body, Patch, Param, Query, Delete, UseGuards, ClassSerializerInterceptor, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, ApiUnsupportedMediaTypeResponse, getSchemaPath } from '@nestjs/swagger';

import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto, AddMediaVideoDto, UpdateMediaVideoDto, AddMediaSourceDto, SaveMediaSourceDto, AddMediaChapterDto, AddTVEpisodeDto, FindTVEpisodesDto, PaginateMediaDto, UpdateMediaChapterDto, UpdateTVEpisodeDto, FindMediaDto } from './dto';
import { AuthUserDto, UploadFileInterceptor, UploadImageInterceptor } from '../users';
import { Media, MediaChapter, MediaDetails, MediaSubtitle, MediaUploadSession, MediaVideo, MediaStream, TVEpisode } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { Paginated } from '../roles';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { FileUpload } from '../../decorators/file-upload.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { UserPermission } from '../../enums';
import {
  UPLOAD_BACKDROP_MAX_SIZE, UPLOAD_BACKDROP_MIN_HEIGHT, UPLOAD_BACKDROP_MIN_WIDTH, UPLOAD_BACKDROP_RATIO,
  UPLOAD_MEDIA_IMAGE_TYPES, UPLOAD_SUBTITLE_TYPES, UPLOAD_POSTER_MAX_SIZE, UPLOAD_POSTER_MIN_HEIGHT, UPLOAD_POSTER_MIN_WIDTH,
  UPLOAD_POSTER_RATIO, UPLOAD_STILL_MAX_SIZE, UPLOAD_STILL_MIN_WIDTH, UPLOAD_STILL_MIN_HEIGHT, UPLOAD_STILL_RATIO,
  UPLOAD_SUBTITLE_MAX_SIZE
} from '../../config';

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
  create(@AuthUser() authUser: AuthUserDto, @Body() createMediaDto: CreateMediaDto) {
    return this.mediaService.create(createMediaDto, authUser);
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
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() paginateMediaDto: PaginateMediaDto) {
    return this.mediaService.findAll(paginateMediaDto, acceptLanguage, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get details of a media (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a media, users with granted permissions can see more details', type: MediaDetails })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Param('id') id: string, @Query() findMediaDto: FindMediaDto) {
    return this.mediaService.findOne(id, acceptLanguage, findMediaDto, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update details of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated media', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(id, updateMediaDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Media has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.remove(id, authUser);
  }

  @Post(':id/videos')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a video (trailer/teaser) to an existing media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added videos', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() addMediaVideoDto: AddMediaVideoDto) {
    return this.mediaService.addMediaVideo(id, addMediaVideoDto, authUser);
  }

  @Get(':id/videos')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all videos in a media (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of videos', type: [MediaVideo] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMediaVideos(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Headers('Accept-Language') acceptLanguage: string) {
    return this.mediaService.findAllMediaVideos(id, acceptLanguage, authUser);
  }

  @Patch(':id/videos/:video_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update a video (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated videos', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  updateMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('video_id') videoId: string, @Body() updateMediaVideoDto: UpdateMediaVideoDto) {
    return this.mediaService.updateMediaVideo(id, videoId, updateMediaVideoDto, authUser);
  }

  @Delete(':id/videos/:video_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a video by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Video has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the video) could not be found', type: ErrorMessage })
  deleteMediaVideo(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('video_id') videoId: string) {
    return this.mediaService.deleteMediaVideo(id, videoId, authUser);
  }

  @Patch(':id/poster')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_POSTER_MAX_SIZE,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    minWidth: UPLOAD_POSTER_MIN_WIDTH,
    minHeight: UPLOAD_POSTER_MIN_HEIGHT,
    ratio: UPLOAD_POSTER_RATIO
  }))
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Upload media poster (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_POSTER_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_POSTER_MIN_WIDTH}x${UPLOAD_POSTER_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: 2/3`
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
  updatePoster(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @FileUpload() file: Storage.MultipartFile) {
    return this.mediaService.uploadMediaPoster(id, file, authUser);
  }

  @Delete(':id/poster')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the current poster of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Poster has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deletePoster(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.deleteMediaPoster(id, authUser);
  }

  @Patch(':id/backdrop')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_BACKDROP_MAX_SIZE,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    minWidth: UPLOAD_BACKDROP_MIN_WIDTH,
    minHeight: UPLOAD_BACKDROP_MIN_HEIGHT,
    ratio: UPLOAD_BACKDROP_RATIO
  }))
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Upload media backdrop (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_BACKDROP_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_BACKDROP_MIN_WIDTH}x${UPLOAD_BACKDROP_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: 16/9`
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
  updateBackdrop(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @FileUpload() file: Storage.MultipartFile) {
    return this.mediaService.uploadMediaBackdrop(id, file, authUser);
  }

  @Delete(':id/backdrop')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the current backdrop of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Backdrop has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteBackdrop(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.deleteMediaBackdrop(id, authUser);
  }

  @Post(':id/movie/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @UseInterceptors(new UploadFileInterceptor({
    maxSize: UPLOAD_SUBTITLE_MAX_SIZE,
    mimeTypes: UPLOAD_SUBTITLE_TYPES
  }))
  @ApiBearerAuth()
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
  updateMovieSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @FileUpload() file: Storage.MultipartFile) {
    return this.mediaService.uploadMovieSubtitle(id, file, authUser);
  }

  @Get(':id/movie/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find all subtitles in a movie' })
  @ApiOkResponse({ description: 'Return a list of subtitles', type: [MediaSubtitle] })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMovieSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.findAllMovieSubtitles(id, authUser);
  }

  @Delete(':id/movie/subtitles/:subtitle_id')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a subtitle of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitle has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteMovieSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('subtitle_id') subtitleId: string) {
    return this.mediaService.deleteMovieSubtitle(id, subtitleId, authUser);
  }

  @Post(':id/movie/source')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a session to upload the video source of a movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return upload session id and url', type: MediaUploadSession })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMovieSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() addMediaSourceDto: AddMediaSourceDto) {
    return this.mediaService.uploadMovieSource(id, addMediaSourceDto, authUser);
  }

  @Post(':id/movie/source/:session_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a video source from a movie's finished upload session (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been added' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  saveMovieSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('session_id') sessionId: string, @Body() saveMediaSourceDto: SaveMediaSourceDto) {
    return this.mediaService.saveMovieSource(id, sessionId, saveMediaSourceDto, authUser);
  }

  @Delete(':id/movie/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the source of a movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'The source has been deleted', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteMovieSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.deleteMovieSource(id, authUser);
  }

  @Get(':id/movie/streams')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find streams of a movie' })
  @ApiCreatedResponse({ description: 'Return stream data', type: MediaStream })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findAllMovieStreams(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.mediaService.findAllMovieStreams(id, authUser);
  }

  @Post(':id/movie/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a chapter to an existing movie (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added chapters', type: [MediaChapter] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() addMediaChapterDto: AddMediaChapterDto) {
    return this.mediaService.addMovieChapter(id, addMediaChapterDto, authUser);
  }

  @Get(':id/movie/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all chapters in a movie, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of chapters', type: [MediaChapter] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllMovieChapters(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Headers('Accept-Language') acceptLanguage: string) {
    return this.mediaService.findAllMovieChapters(id, acceptLanguage, authUser);
  }

  @Patch(':id/movie/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update a chapter (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated chapters', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the chapter) could not be found', type: ErrorMessage })
  updateMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('chapter_id') chapterId: string, @Body() updateMediaChapterDto: UpdateMediaChapterDto) {
    return this.mediaService.updateMovieChapter(id, chapterId, updateMediaChapterDto, authUser);
  }

  @Delete(':id/movie/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a chapter by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return all chapters except the deleted one' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media (or the chapter) could not be found', type: ErrorMessage })
  deleteMovieChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('chapter_id') chapterId: string) {
    return this.mediaService.deleteMovieChapter(id, chapterId, authUser);
  }

  @Post(':id/tv/episodes')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a new episode for a tv show (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new episode', type: TVEpisode })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  addTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() addTVEpisodeDto: AddTVEpisodeDto) {
    return this.mediaService.addTVEpisode(id, addTVEpisodeDto, authUser);
  }

  @Get(':id/tv/episodes')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find all episodes from a tv show' })
  @ApiOkResponse({ description: 'Return all episodes from a tv show', type: [TVEpisode] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The media is private', type: ErrorMessage })
  findAllTVEpisodes(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Query() findEpisodesDto: FindTVEpisodesDto, @Headers('Accept-Language') acceptLanguage: string) {
    return this.mediaService.findAllTVEpisodes(id, findEpisodesDto, acceptLanguage, authUser);
  }

  @Get(':id/tv/episodes/:episode_id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get details of an episode (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return an episode', type: MediaDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  findOneTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Headers('Accept-Language') acceptLanguage: string) {
    return this.mediaService.findOneTVEpisodes(id, episodeId, acceptLanguage, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated episode', type: TVEpisode })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  updateTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Body() updateTVEpisodeDto: UpdateTVEpisodeDto) {
    return this.mediaService.updateTVEpisode(id, episodeId, updateTVEpisodeDto, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Episode has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteTVEpisode(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string) {
    return this.mediaService.deleteTVEpisode(id, episodeId, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id/still')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_STILL_MAX_SIZE,
    minWidth: UPLOAD_STILL_MIN_WIDTH,
    minHeight: UPLOAD_STILL_MIN_HEIGHT,
    mimeTypes: UPLOAD_MEDIA_IMAGE_TYPES,
    ratio: UPLOAD_STILL_RATIO
  }))
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Upload episode still image (permissions: ${UserPermission.MANAGE_MEDIA})`,
    description: `Limit: ${UPLOAD_STILL_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_STILL_MIN_WIDTH}x${UPLOAD_STILL_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_MEDIA_IMAGE_TYPES.join(', ')}<br/>Aspect ratio: 16/9`
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
  updateTVEpisodeStill(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @FileUpload() file: Storage.MultipartFile) {
    return this.mediaService.uploadTVEpisodeStill(id, episodeId, file, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @UseInterceptors(new UploadFileInterceptor({
    maxSize: UPLOAD_SUBTITLE_MAX_SIZE,
    mimeTypes: UPLOAD_SUBTITLE_TYPES
  }))
  @ApiBearerAuth()
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
  updateTVEpisodeSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @FileUpload() file: Storage.MultipartFile) {
    return this.mediaService.uploadTVEpisodeSubtitle(id, episodeId, file, authUser);
  }

  @Get(':id/tv/episodes/:episode_id/subtitles')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find all subtitles in a movie' })
  @ApiOkResponse({ description: 'Return a list of subtitles', type: [MediaSubtitle] })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The episode is private', type: ErrorMessage })
  findAllTVEpisodeSubtitles(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string) {
    return this.mediaService.findAllTVEpisodeSubtitles(id, episodeId, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/subtitles/:subtitle_id')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a subtitle of a media (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Subtitle has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteTVSubtitle(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Param('subtitle_id') subtitleId: string) {
    return this.mediaService.deleteTVEpisodeSubtitle(id, episodeId, subtitleId, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/source')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a session to upload the video source of an tv episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return upload session id and url', type: MediaUploadSession })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  addTVEpisodeSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Body() addMediaSourceDto: AddMediaSourceDto) {
    return this.mediaService.uploadTVEpisodeSource(id, episodeId, addMediaSourceDto, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/source/:session_id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a video source from a tv episode's finished upload session (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Source has been added' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  saveTVEpisodeSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Param('session_id') sessionId: string, @Body() saveMediaSourceDto: SaveMediaSourceDto) {
    return this.mediaService.saveTVEpisodeSource(id, episodeId, sessionId, saveMediaSourceDto, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/source')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the source of an episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'The source has been deleted', type: MediaDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  deleteTVEpisodeSource(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string) {
    return this.mediaService.deleteTVEpisodeSource(id, episodeId, authUser);
  }

  @Get(':id/tv/episodes/:episode_number/streams')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find streams of an episode' })
  @ApiCreatedResponse({ description: 'Return stream data', type: MediaStream })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'This episode is private', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The media could not be found', type: ErrorMessage })
  findAllTVEpisodeStreams(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_number') episodeNumber: string) {
    return this.mediaService.findAllTVEpisodeStreams(id, +episodeNumber, authUser);
  }

  @Post(':id/tv/episodes/:episode_id/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Add a chapter to an existing episode (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return added chapters', type: [MediaChapter] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  addTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Body() addMediaChapterDto: AddMediaChapterDto) {
    return this.mediaService.addTVEpisodeChapter(id, episodeId, addMediaChapterDto, authUser);
  }

  @Get(':id/tv/episodes/:episode_id/chapters')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all chapters in an episode, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return a list of chapters', type: [MediaChapter] })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'The episode is private', type: ErrorMessage })
  findAllTVEpisodeChapters(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Headers('Accept-Language') acceptLanguage: string) {
    return this.mediaService.findAllTVEpisodeChapters(id, episodeId, acceptLanguage, authUser);
  }

  @Patch(':id/tv/episodes/:episode_id/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update a chapter (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiCreatedResponse({ description: 'Return updated chapters', type: [MediaVideo] })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode (or the chapter) could not be found', type: ErrorMessage })
  updateTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Param('chapter_id') chapterId: string, @Body() updateMediaChapterDto: UpdateMediaChapterDto) {
    return this.mediaService.updateTVEpisodeChapter(id, episodeId, chapterId, updateMediaChapterDto, authUser);
  }

  @Delete(':id/tv/episodes/:episode_id/chapters/:chapter_id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a chapter by id (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return all chapters except the deleted one' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The episode (or the chapter) could not be found', type: ErrorMessage })
  deleteTVEpisodeChapter(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Param('episode_id') episodeId: string, @Param('chapter_id') chapterId: string) {
    return this.mediaService.deleteTVEpisodeChapter(id, episodeId, chapterId, authUser);
  }
}
