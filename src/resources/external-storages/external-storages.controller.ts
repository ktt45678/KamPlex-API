import { Controller, Get, Post, Body, Patch, Delete, UseGuards, Param, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddStorageDto } from './dto/add-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { ExternalStoragesService } from './external-storages.service';
import { ExternalStorage } from './entities/external-storage.entity';

@ApiTags('External Storages')
@Controller('external-storages')
export class ExternalStoragesController {
  constructor(private readonly externalStoragesService: ExternalStoragesService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an external storage (owner)' })
  @ApiCreatedResponse({ description: 'Return new storage info', type: ExternalStorage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@Body() addStorageDto: AddStorageDto) {
    return this.externalStoragesService.create(addStorageDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all external storages (owner)' })
  @ApiOkResponse({ description: 'Return a list of all storages', type: [ExternalStorage] })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  findAll() {
    return this.externalStoragesService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an external storage (owner)' })
  @ApiOkResponse({ description: 'Return an external storage', type: ExternalStorage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  findOne(@Param('id') id: string) {
    return this.externalStoragesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an external storage (owner)' })
  @ApiOkResponse({ description: 'Return updated storage', type: InfoMessage })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  updateExternalApi(@Param('id') id: string, @Body() updateStorageDto: UpdateStorageDto) {
    return this.externalStoragesService.update(id, updateStorageDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an external storage (owner)' })
  @ApiNoContentResponse({ description: 'Storage has been deleted' })
  @ApiNotFoundResponse({ description: 'Storage not found', type: ErrorMessage })
  removeExternalApi(@Param('id') id: string) {
    return this.externalStoragesService.remove(id);
  }
}
