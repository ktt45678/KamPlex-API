import { Body, ClassSerializerInterceptor, Controller, Headers, Get, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { UpdateHistoryDto, CursorPageHistoryDto, FindWatchTimeDto } from './dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { HistoryService } from './history.service';
import { History, HistoryGroup } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { CursorPaginated } from '../../common/entities';

@ApiTags('History')
@ApiExtraModels(CursorPaginated, History, HistoryGroup)
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
        { $ref: getSchemaPath(CursorPaginated) },
        {
          properties: {
            results: {
              type: 'array', items: {
                allOf: [
                  { $ref: getSchemaPath(HistoryGroup) },
                  { properties: { historyList: { type: 'array', items: { $ref: getSchemaPath(History) } } } }
                ]
              }
            }
          }
        }
      ]
    }
  })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Headers('Accept-Language') acceptLanguage: string, @Query() cursorPageHistoryDto: CursorPageHistoryDto) {
    return this.historyService.findAll(cursorPageHistoryDto, acceptLanguage, authUser);
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

  @Get('watch_time')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get watch time of a media ' })
  @ApiOkResponse({ description: 'Return a watch time of a media', })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findOneWatchTime(@AuthUser() authUser: AuthUserDto, @Query() findWatchTimeDto: FindWatchTimeDto) {
    return this.historyService.findOneWatchTime(findWatchTimeDto, authUser);
  }
}
