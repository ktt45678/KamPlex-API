import { CursorPaginated } from '../../../common/entities';
import { HistoryGroup } from './history-group.entity';

export class CursorPaginatedHistory extends CursorPaginated<HistoryGroup> {
  constructor() {
    super({ type: HistoryGroup });
  }
}
