import { Controller, Get, Post, Body, Patch, Delete, UseGuards, Param, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AddStorageDto, UpdateStorageDto } from './dto';
import { ExternalStorage } from './entities';
import { ParseBigIntPipe } from '../../common/pipes';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { ExternalStoragesService } from './external-storages.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';

@ApiTags('External Storages')
@Controller()
export class ExternalStoragesController {
  constructor(private readonly externalStoragesService: ExternalStoragesService) { }

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an external storage (owner)' })
  @ApiCreatedResponse({ description: 'Return new storage info', type: ExternalStorage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() addStorageDto: AddStorageDto) {
    return this.externalStoragesService.create(addStorageDto, authUser);
  }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all external storages (owner)' })
  @ApiOkResponse({ description: 'Return a list of all storages', type: [ExternalStorage] })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll() {
    return this.externalStoragesService.findAll();
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Get an external storage (owner)' })
  @ApiOkResponse({ description: 'Return an external storage', type: ExternalStorage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.externalStoragesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Update an external storage (owner)' })
  @ApiOkResponse({ description: 'Return updated storage', type: ExternalStorage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updateStorageDto: UpdateStorageDto) {
    return this.externalStoragesService.update(id, updateStorageDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Delete an external storage (owner)' })
  @ApiNoContentResponse({ description: 'Storage has been deleted' })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.externalStoragesService.remove(id, authUser);
  }
}
