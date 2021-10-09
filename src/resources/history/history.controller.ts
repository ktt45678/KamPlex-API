import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';

import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateHistoryDto } from './dto/paginate-history.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { HistoryService } from './history.service';
import { History } from './entities/history.entity';
import { Paginated } from '../roles/entities/paginated.entity';

@ApiTags('History')
@ApiExtraModels(History)
@Controller()
export class HistoryController {
  constructor(private readonly historyService: HistoryService) { }

  @Get()
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
  findAll(@AuthUser() authUser: AuthUserDto, @Query() paginateHistoryDto: PaginateHistoryDto) {
    return this.historyService.findAll(paginateHistoryDto, authUser);
  }
}
