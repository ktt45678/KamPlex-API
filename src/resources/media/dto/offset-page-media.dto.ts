import { IntersectionType } from '@nestjs/swagger';

import { OffsetPaginateDto } from '../../../common/dto';
import { PaginateMediaDto } from './paginate-media.dto';

export class OffsetPageMediaDto extends IntersectionType(OffsetPaginateDto, PaginateMediaDto) { }
