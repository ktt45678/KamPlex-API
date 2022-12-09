import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { History } from './history.entity';

export class HistoryGroup {
  @ApiProperty()
  groupByDate: string;

  @ApiProperty()
  @Type(() => History)
  historyList: History[] = [];
}
