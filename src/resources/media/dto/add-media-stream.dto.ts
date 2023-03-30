import { QueueProgressCode } from '../../../enums';

export class AddMediaStreamDto {
  code: QueueProgressCode;
  sourceId: string;
  streamId: string;
  fileName: string;
  codec: number;
  runtime: number;
  quality: number;
  media: string;
  episode?: string;
  storage: string;
}
