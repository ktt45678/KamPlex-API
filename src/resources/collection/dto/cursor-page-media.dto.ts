import { OmitType } from '@nestjs/swagger';

import { CursorPaginateDto } from '../../../common/dto';

export class CursorPageMediaDto extends OmitType(CursorPaginateDto, ['search'] as const) { }
