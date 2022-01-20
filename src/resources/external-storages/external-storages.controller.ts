import { Controller, Get, Post, Body, Patch, Delete, UseGuards, Param, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddStorageDto } from './dto/add-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { ExternalStoragesService } from './external-storages.service';
import { ExternalStorage } from './entities/external-storage.entity';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthUserDto } from '../users/dto/auth-user.dto';

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
  @ApiOperation({ summary: 'Get an external storage (owner)' })
  @ApiOkResponse({ description: 'Return an external storage', type: ExternalStorage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@Param('id') id: string) {
    return this.externalStoragesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an external storage (owner)' })
  @ApiOkResponse({ description: 'Return updated storage', type: ExternalStorage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id') id: string, @Body() updateStorageDto: UpdateStorageDto) {
    return this.externalStoragesService.update(id, updateStorageDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an external storage (owner)' })
  @ApiNoContentResponse({ description: 'Storage has been deleted' })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto, @Param('id') id: string) {
    return this.externalStoragesService.remove(id, authUser);
  }
}
