import { Controller, Get, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';
import { Jwt } from '../auth/entities/jwt.enity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OwnerGuard } from '../auth/guards/owner.guard';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a setting for the application, can only have one' })
  @ApiCreatedResponse({ description: 'Create a new user and make him/her the owner, return access token and refresh token.', type: Jwt })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  @UseGuards(AuthGuard, OwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current setting (owner only)' })
  @ApiOkResponse({ description: 'Return the current setting.', type: Setting })
  @ApiNotFoundResponse({ description: 'Setting was not created.', type: ErrorMessage })
  findOne() {
    return this.settingsService.findOne();
  }

  @Patch()
  @UseGuards(AuthGuard, OwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current setting, can be used to change the owner (owner only)' })
  @ApiOkResponse({ description: 'Setting has been updated.', type: InfoMessage })
  @ApiNotFoundResponse({ description: 'Setting was not created.', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  update(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(updateSettingDto);
  }

  @Delete()
  @UseGuards(AuthGuard, OwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current setting (owner only)' })
  @ApiOkResponse({ description: 'Setting has been deleted.', type: InfoMessage })
  @ApiNotFoundResponse({ description: 'Setting was not created.', type: ErrorMessage })
  remove() {
    return this.settingsService.remove();
  }
}
