import { ApiProperty } from '@nestjs/swagger';

import { History } from './history.entity';

export class HistoryGroupable extends History {
  @ApiProperty()
  groupByDate: string;
}
