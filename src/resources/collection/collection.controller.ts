import { Controller, Headers, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, Query, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, ApiUnsupportedMediaTypeResponse, getSchemaPath } from '@nestjs/swagger';

import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { FileUpload } from '../../decorators/file-upload.decorator';
import { ErrorMessage } from '../auth';
import { AuthUserDto, UploadImageInterceptor } from '../users';
import { Paginated } from '../roles';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CollectionService } from './collection.service';
import { CreateCollectionDto, FindCollectionDto, PaginateCollectionsDto, UpdateCollectionDto } from './dto';
import { Collection, CollectionDetails } from './entities';
import { UserPermission } from '../../enums';
import {
  UPLOAD_POSTER_MAX_SIZE, UPLOAD_MEDIA_IMAGE_TYPES, UPLOAD_POSTER_MIN_WIDTH, UPLOAD_POSTER_MIN_HEIGHT, UPLOAD_POSTER_RATIO,
  UPLOAD_BACKDROP_MAX_SIZE, UPLOAD_BACKDROP_MIN_WIDTH, UPLOAD_BACKDROP_MIN_HEIGHT, UPLOAD_BACKDROP_RATIO
} from '../../config';

@ApiTags('Collections')
@ApiExtraModels(Collection)
@Controller()
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create collections if not exist (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new collections (single or array)', type: CollectionDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createCollectionDto: CreateCollectionDto) {
    return this.collectionService.create(createCollectionDto, authUser);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all collections, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of collections',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Collection) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() paginateCollectionsDto: PaginateCollectionsDto) {
    return this.collectionService.findAll(paginateCollectionsDto, acceptLanguage, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get details of a collection, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return details of a collection', type: CollectionDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The collection could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Param('id') id: string, @Query() findCollectionDto: FindCollectionDto) {
    return this.collectionService.findOne(id, findCollectionDto, acceptLanguage, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update details of a collection (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated collection', type: CollectionDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The collection could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateCollectionDto: UpdateCollectionDto) {
    return this.collectionService.update(id, updateCollectionDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a collection (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Collection has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The collection could not be found', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.collectionService.remove(id, authUser);
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
    summary: `Upload collection poster (permissions: ${UserPermission.MANAGE_MEDIA})`,
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
    return this.collectionService.uploadPoster(id, file, authUser);
  }

  @Delete(':id/poster')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the current poster of a collection (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Poster has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deletePoster(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.collectionService.deletePoster(id, authUser);
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
    summary: `Upload collection backdrop (permissions: ${UserPermission.MANAGE_MEDIA})`,
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
    return this.collectionService.uploadBackdrop(id, file, authUser);
  }

  @Delete(':id/backdrop')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete the current backdrop of a collection (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Backdrop has beed deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  deleteBackdrop(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.collectionService.deleteBackdrop(id, authUser);
  }
}
