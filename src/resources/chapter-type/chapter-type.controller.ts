import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, HttpCode, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { ChapterTypeService } from './chapter-type.service';
import { CreateChapterTypeDto, OffsetPageChapterTypesDto, UpdateChapterTypeDto } from './dto';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChapterType } from './entities';
import { Paginated } from '../../common/entities';
import { HeadersDto } from '../../common/dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { ParseBigIntPipe } from '../../common/pipes';
import { UserPermission } from '../../enums';

@ApiTags('Chapter Types')
@Controller()
export class ChapterTypeController {
  constructor(private readonly chapterTypeService: ChapterTypeService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a chapter type (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return new chapter type', type: ChapterType })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() createChapterTypeDto: CreateChapterTypeDto) {
    return this.chapterTypeService.create(createChapterTypeDto, headers, authUser);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all chapter types, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({
    description: 'Return a list of chapter types',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(ChapterType) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() offsetPageChapterTypesDto: OffsetPageChapterTypesDto) {
    return this.chapterTypeService.findAll(offsetPageChapterTypesDto, headers, authUser);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Get details of a chapter type, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return details of a chapter type', type: ChapterType })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The chapter type could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.chapterTypeService.findOne(id, headers, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Update details of a chapter type (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated chapter type', type: ChapterType })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The chapter type could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateChapterTypeDto: UpdateChapterTypeDto) {
    return this.chapterTypeService.update(id, updateChapterTypeDto, headers, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete a chapter type (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Chapter type has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The chapter type could not be found', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.chapterTypeService.remove(id, headers, authUser);
  }
}
