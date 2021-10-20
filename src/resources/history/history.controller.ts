import { ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';

import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateHistoryDto } from './dto/paginate-history.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { HistoryService } from './history.service';
import { History } from './entities/history.entity';
import { Paginated } from '../roles/entities/paginated.entity';
import { ErrorMessage } from '../auth/entities/error-message.entity';

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
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Query() paginateHistoryDto: PaginateHistoryDto) {
    return this.historyService.findAll(paginateHistoryDto, authUser);
  }
}
