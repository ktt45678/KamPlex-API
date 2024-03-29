import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { RolesService } from './roles.service';
import { CreateRoleDto, PaginateDto, UpdateRoleDto, UpdateRoleUsersDto } from './dto';
import { Role, RoleDetails, RoleUsers } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { Paginated } from '../../common/entities';
import { ParseBigIntPipe } from '../../common/pipes';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { UserPermission } from '../../enums';

@ApiTags('Roles')
@ApiExtraModels(Paginated, Role, RoleUsers)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Return new role', type: RoleDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto, authUser);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find all roles' })
  @ApiOkResponse({
    description: 'Return a list of roles',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Role) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Query() paginateDto: PaginateDto) {
    return this.rolesService.findAll(paginateDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Get details of a role (optional auth, optional permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Return a role, users with granted permissions can see more details', type: RoleDetails })
  @ApiNotFoundResponse({ description: 'The role could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Update a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Role has been updated', type: RoleDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: `Delete a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiNoContentResponse({ description: 'Role has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.rolesService.remove(id, authUser);
  }

  @Get(':id/users')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Find all users in a role' })
  @ApiOkResponse({
    description: 'Return a list of users',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(RoleUsers) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAllUsers(@Param('id', ParseBigIntPipe) id: bigint, @Query() paginateDto: PaginateDto) {
    return this.rolesService.findAllUsers(id, paginateDto);
  }

  @Patch(':id/users')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Update users in role' })
  @ApiOkResponse({ description: 'Return a list of users', type: UpdateRoleUsersDto })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  updateRoleUsers(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updateRoleUsersDto: UpdateRoleUsersDto) {
    return this.rolesService.updateRoleUsers(id, updateRoleUsersDto, authUser);
  }
}
