import { Controller, Get, Body, Patch, Param, UseGuards, Query, UseInterceptors, Delete, HttpCode, ClassSerializerInterceptor } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, ApiUnsupportedMediaTypeResponse, getSchemaPath } from '@nestjs/swagger';

import { User } from './entities/user.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { Avatar } from './entities/avatar.enity';
import { Paginated } from '../roles/entities/paginated.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { FileUpload } from '../../decorators/file-upload.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { PaginateDto } from '../roles/dto/paginate.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { UserPermission } from '../../enums';
import { UPLOAD_AVATAR_MAX_SIZE, UPLOAD_AVATAR_TYPES, UPLOAD_AVATAR_MIN_WIDTH, UPLOAD_AVATAR_MIN_HEIGHT } from '../../config';
import { UploadImageInterceptor } from './interceptors/upload-image.interceptor';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Find all users' })
  @ApiOkResponse({
    description: 'Return a list of users',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, username: { type: 'string' }, displayName: { type: 'string' }, createdAt: { type: 'string' }, banned: { type: 'boolean' }, lastActiveAt: { type: 'string' }, avatarUrl: { type: 'string' }, thumbnailAvatarUrl: { type: 'string' } } } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Query() paginateDto: PaginateDto) {
    return this.usersService.findAll(paginateDto);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_USERS], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get user info from you or someone else (optional auth, optional permission: ${UserPermission.MANAGE_USERS})` })
  @ApiOkResponse({
    description: 'Return user info.<br/>If it\'s your info or you have the required permissions, email, birthdate and verified will be included',
    schema: {
      allOf: [
        { $ref: getSchemaPath(User) },
        { properties: { roles: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, color: { type: 'integer' } } } } } },
        { $ref: getSchemaPath(Avatar) }
      ]
    }
  })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  async findOne(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    const user = await this.usersService.findOne(id, authUser);
    return user;
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_USERS], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update info of a user (optional permission: ${UserPermission.MANAGE_USERS})` })
  @ApiOkResponse({ description: 'Return updated info.<br/>If it\'s yours, jwt tokens will be included', type: User })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto, authUser);
  }

  @Get(':id/avatar')
  @ApiOperation({ summary: 'Find a user avatar' })
  @ApiOkResponse({ description: 'Return avatar urls of a user', type: Avatar })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  findOneAvatar(@Param('id') id: string) {
    return this.usersService.findOneAvatar(id);
  }

  @Patch(':id/avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(new UploadImageInterceptor({
    maxSize: UPLOAD_AVATAR_MAX_SIZE,
    mimeTypes: UPLOAD_AVATAR_TYPES,
    minWidth: UPLOAD_AVATAR_MIN_WIDTH,
    minHeight: UPLOAD_AVATAR_MIN_HEIGHT
  }))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload an avatar',
    description: `Limit: ${UPLOAD_AVATAR_MAX_SIZE} Bytes<br/>Min resolution: ${UPLOAD_AVATAR_MIN_WIDTH}x${UPLOAD_AVATAR_MIN_HEIGHT}<br/>
    Mime types: ${UPLOAD_AVATAR_TYPES.join(', ')}`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Return avatar url', type: Avatar })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiUnprocessableEntityResponse({ description: 'Failed to check file type', type: ErrorMessage })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported file', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  updateAvatar(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @FileUpload() file: Storage.MultipartFile) {
    return this.usersService.updateAvatar(id, file, authUser);
  }

  @Delete(':id/avatar')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own avatar' })
  @ApiOkResponse({ description: 'Avatar has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The user or avatar could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  deleteAvatar(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.usersService.deleteAvatar(id, authUser);
  }
}
