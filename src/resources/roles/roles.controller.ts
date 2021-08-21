import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateDto } from './dto/paginate.dto';
import { UpdateRoleUsersDto } from './dto/update-role-users.dto';
import { Role } from './entities/role.entity';
import { Paginated } from './entities/paginated.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { UserPermission } from '../../enums/user-permission.enum';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';

@ApiTags('Roles')
@ApiExtraModels(Paginated)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Create a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Return new role', type: Role })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return role;
  }

  @Get()
  @ApiOperation({ summary: 'Find all roles' })
  @ApiOkResponse({
    description: 'Return a list of roles',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, color: { type: 'integer' } } } } } }
      ]
    }
  })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  findAll(@Query() paginateDto: PaginateDto) {
    return this.rolesService.findAll(paginateDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a role' })
  @ApiOkResponse({ description: 'Return role details', type: Role })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Role has been updated', type: Role })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiNoContentResponse({ description: 'Role has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.rolesService.remove(id, authUser);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Find all users in a role' })
  @ApiOkResponse({
    description: 'Return a list of users',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, username: { type: 'string' }, displayName: { type: 'string' }, isBanned: { type: 'boolean' }, lastActiveAt: { type: 'string' }, createdAt: { type: 'string' } } } } } }
      ]
    }
  })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  findAllUsers(@Param('id') id: string, @Query() paginateDto: PaginateDto) {
    return this.rolesService.findAllUsers(id, paginateDto);
  }

  @Patch(':id/users')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update users in role' })
  @ApiOkResponse({ description: 'Return a list of users' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  updateRoleUsers(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateRoleUsersDto: UpdateRoleUsersDto) {
    return this.rolesService.updateRoleUsers(id, updateRoleUsersDto, authUser);
  }
}
