import { OmitType } from '@nestjs/swagger';

import { CursorPaginateDto } from '../../../common/dto';

export class CursorPagePlaylistItemsDto extends OmitType(CursorPaginateDto, ['search'] as const) { }
