import { Controller, Get, Post, Body, Patch, Delete, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';
import { Jwt } from '../auth/entities/jwt.enity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a setting for the application, can only have one' })
  @ApiCreatedResponse({ description: 'Create a new user who is also the owner, return access token and refresh token', type: Jwt })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current setting (owner only)' })
  @ApiOkResponse({ description: 'Return the current setting', type: Setting })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  findOne() {
    return this.settingsService.findOne();
  }

  @Patch()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current setting, can be used to change the owner (owner only)' })
  @ApiOkResponse({ description: 'Setting has been updated', type: Setting })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(updateSettingDto);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current setting (owner only)' })
  @ApiNoContentResponse({ description: 'Setting has been deleted' })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  remove() {
    return this.settingsService.remove();
  }
}
