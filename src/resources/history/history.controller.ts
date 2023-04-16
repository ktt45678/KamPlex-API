import { Body, ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors, Delete, Param, Patch, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { UpdateHistoryDto, CursorPageHistoryDto, FindWatchTimeDto, UpdateWatchTimeDto } from './dto';
import { CursorPaginated } from '../../common/entities';
import { HeadersDto } from '../../common/dto';
import { ParseBigIntPipe } from '../../common/pipes';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RequestHeaders } from '../../decorators/request-headers.decorator';
import { HistoryService } from './history.service';
import { History, HistoryGroup } from './entities';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';

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
  findAll(@AuthUser() authUser: AuthUserDto, @RequestHeaders(HeadersDto) headers: HeadersDto, @Query() cursorPageHistoryDto: CursorPageHistoryDto) {
    return this.historyService.findAll(cursorPageHistoryDto, headers, authUser);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Update history' })
  @ApiOkResponse({ description: 'History record has been updated' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The rating could not be found', type: ErrorMessage })
  update(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint, @Body() updateHistoryDto: UpdateHistoryDto) {
    return this.historyService.update(id, updateHistoryDto, authUser);
  }

  @Get('watch_time')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get watch time of a media ' })
  @ApiOkResponse({ description: 'Return a watch time of a media', })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  findOneWatchTime(@AuthUser() authUser: AuthUserDto, @Query() findWatchTimeDto: FindWatchTimeDto) {
    return this.historyService.findOneWatchTime(findWatchTimeDto, authUser);
  }

  @Patch('watch_time')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update history watch time' })
  @ApiOkResponse({ description: 'Watch time has been updated' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  updateWatchTime(@AuthUser() authUser: AuthUserDto, @Body() updateWatchTimeDto: UpdateWatchTimeDto) {
    return this.historyService.updateWatchTime(updateWatchTimeDto, authUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Remove a record' })
  @ApiNoContentResponse({ description: 'Successfully removed' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The rating could not be found', type: ErrorMessage })
  async remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.historyService.remove(id, authUser);
  }
}
