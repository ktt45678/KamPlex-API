import { IntersectionType } from '@nestjs/swagger';

import { CursorPaginateDto } from '../../../common/dto';
import { PaginateMediaDto } from './paginate-media.dto';

export class CursorPageMediaDto extends IntersectionType(CursorPaginateDto, PaginateMediaDto) { }
