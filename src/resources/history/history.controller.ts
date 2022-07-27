import { Body, ClassSerializerInterceptor, Controller, Headers, Get, Param, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { UpdateHistoryDto, PaginateHistoryDto } from './dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { HistoryService } from './history.service';
import { History } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { Paginated } from '../roles';

@ApiTags('History')
@ApiExtraModels(History)
@Controller()
export class HistoryController {
  constructor(private readonly historyService: HistoryService) { }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View recently watched media' })
  @ApiOkResponse({
    description: 'Return a list of recently watched media',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(History) } } } }
      ]
    }
  })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() paginateHistoryDto: PaginateHistoryDto) {
    return this.historyService.findAll(paginateHistoryDto, acceptLanguage, authUser);
  }

  @Put()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update media to history' })
  @ApiNoContentResponse({ description: 'Updated media to history' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Body() updateHistoryDto: UpdateHistoryDto) {
    return this.historyService.update(updateHistoryDto, authUser);
  }

  @Get('watchtime/:media_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get media watchtime' })
  @ApiOkResponse({ description: 'Return a watchtime of a media', })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOneWatchtime(@AuthUser() authUser: AuthUserDto, @Param('media_id') mediaId: string) {
    return this.historyService.findOneWatchtime(mediaId, authUser);
  }
}
