import { ClassSerializerInterceptor, Controller, Get, Post, Body, Patch, Delete, UseGuards, HttpCode, UseInterceptors } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { Jwt } from '../auth/entities/jwt.enity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthUserDto } from '../users/dto/auth-user.dto';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Create a setting for the application, can only have one' })
  @ApiCreatedResponse({ description: 'Create a new user who is also the owner, return access token and refresh token', type: Jwt })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthGuardOptions({ anonymous: true })
  @RolesGuardOptions({ requireOwner: true, throwError: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current setting (owner only)' })
  @ApiOkResponse({ description: 'Return the current setting', type: Setting })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOne(@AuthUser() authUser: AuthUserDto) {
    return this.settingsService.findOne(authUser);
  }

  @Patch()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current setting, can be used to change the owner (owner only)' })
  @ApiOkResponse({ description: 'Setting has been updated', type: Setting })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(updateSettingDto, authUser);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ requireOwner: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current setting (owner only)' })
  @ApiNoContentResponse({ description: 'Setting has been deleted' })
  @ApiNotFoundResponse({ description: 'Setting was not created', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  remove(@AuthUser() authUser: AuthUserDto) {
    return this.settingsService.remove(authUser);
  }
}
