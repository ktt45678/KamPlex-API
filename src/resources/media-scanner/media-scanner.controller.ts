import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';

import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MediaScannerService } from './media-scanner.service';
import { CreateMediaScannerDto } from './dto/create-media-scanner.dto';
import { UpdateMediaScannerDto } from './dto/update-media-scanner.dto';
import { SearchMediaDto } from './dto/search-media.dto';
import { MediaDetailsDto } from './dto/media-details.dto';

import { ErrorMessage } from '../auth/entities/error-message.entity';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserPermission } from '../../enums';

@ApiTags('Media Scanner')
@Controller()
export class MediaScannerController {
  constructor(private readonly mediaScannerService: MediaScannerService) { }

  @Post()
  create(@Body() createMediaScannerDto: CreateMediaScannerDto) {
    return this.mediaScannerService.create(createMediaScannerDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: `Search for movies or tv shows on tmdb (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return media list' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Query() searchMediaDto: SearchMediaDto) {
    return this.mediaScannerService.findAll(searchMediaDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  findOne(@Param('id') id: string, @Query() mediaDetailsDto: MediaDetailsDto) {
    return this.mediaScannerService.findOne(id, mediaDetailsDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMediaScannerDto: UpdateMediaScannerDto) {
    return this.mediaScannerService.update(+id, updateMediaScannerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaScannerService.remove(+id);
  }
}
