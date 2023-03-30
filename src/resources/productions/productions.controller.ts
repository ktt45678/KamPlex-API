import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, UseInterceptors, ClassSerializerInterceptor, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { ProductionsService } from './productions.service';
import { CreateProductionDto, CursorPageMediaDto, CursorPageProductionsDto, RemoveProductionsDto, UpdateProductionDto } from './dto';
import { Production, ProductionDetails } from './entities';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { PaginateDto } from '../roles';
import { Media } from '../media';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { UserPermission } from '../../enums';

@ApiTags('Productions')
@ApiExtraModels(Production)
@Controller()
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a production' })
  @ApiOkResponse({ description: 'Return new production', type: ProductionDetails })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() createProductionDto: CreateProductionDto) {
    return this.productionsService.create(createProductionDto, headers, authUser);
  }

  @Get()
  @ApiOperation({ summary: 'Find all production' })
  @ApiOkResponse({
    description: 'Return a list of productions',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Production) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Query() paginateDto: PaginateDto) {
    return this.productionsService.findAll(paginateDto);
  }

  @Get('cursor')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Find all productions using cursor pagination' })
  @ApiOkResponse({
    description: 'Return a list of productions',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Production) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllCursor(@Query() cursorPageProductionsDto: CursorPageProductionsDto) {
    return this.productionsService.findAllCursor(cursorPageProductionsDto);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Get details of a production' })
  @ApiOkResponse({ description: 'Return a production', type: ProductionDetails })
  @ApiNotFoundResponse({ description: 'The production could not be found', type: ErrorMessage })
  findOne(@Param('id') id: string) {
    return this.productionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update details of a production (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated production', type: ProductionDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The production could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @RequestHeaders(HeadersDto) headers: HeadersDto, @Body() updateProductionDto: UpdateProductionDto) {
    return this.productionsService.update(id, updateProductionDto, headers, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a production (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Production has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The production could not be found', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.productionsService.remove(id, headers, authUser);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete multiple productions (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Productions have been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  removeMany(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() removeProductionsDto: RemoveProductionsDto) {
    return this.productionsService.removeMany(removeProductionsDto, headers, authUser);
  }

  @Get(':id/media')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA], throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find all media in a studio or producer using cursor pagination, (optional auth, optional permissions: ${UserPermission.MANAGE_MEDIA})` })
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
  findAllMedia(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Param('id') id: string, @Query() cursorPageMediaDto: CursorPageMediaDto) {
    return this.productionsService.findAllMedia(id, cursorPageMediaDto, headers, authUser);
  }
}
