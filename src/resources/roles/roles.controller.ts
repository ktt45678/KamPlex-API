import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

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
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { UserPermission } from '../../enums/user-permission.enum';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';
import { RoleDetails } from './entities/role-details.entity';
import { RoleUsers } from './entities/role-users.entity';

@ApiTags('Roles')
@ApiExtraModels(Paginated, RoleUsers)
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
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
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
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Get details of a role (optional auth, optional permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Return a role, users with granted permissions can see more details', type: RoleDetails })
  @ApiNotFoundResponse({ description: 'The role could not be found', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.rolesService.findOne(id, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update a role (permissions: ${UserPermission.MANAGE_ROLES})` })
  @ApiOkResponse({ description: 'Role has been updated', type: RoleDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
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
  @UseInterceptors(ClassSerializerInterceptor)
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
  findAllUsers(@Param('id') id: string, @Query() paginateDto: PaginateDto) {
    return this.rolesService.findAllUsers(id, paginateDto);
  }

  @Patch(':id/users')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_ROLES] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update users in role' })
  @ApiOkResponse({ description: 'Return a list of users', type: UpdateRoleUsersDto })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  updateRoleUsers(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateRoleUsersDto: UpdateRoleUsersDto) {
    return this.rolesService.updateRoleUsers(id, updateRoleUsersDto, authUser);
  }
}
