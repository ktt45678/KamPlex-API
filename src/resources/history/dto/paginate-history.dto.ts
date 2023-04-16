import { OmitType } from '@nestjs/swagger';

import { OffsetPaginateDto } from '../../../common/dto';

export class PaginateHistoryDto extends OmitType(OffsetPaginateDto, ['search', 'sort'] as const) { }
