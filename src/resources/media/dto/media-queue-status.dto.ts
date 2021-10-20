import { MediaQueueUserDto } from './media-queue-user.dto';

export class MediaQueueStatusDto {
  code: string;
  _id: string;
  filename: string;
  size: number;
  mimeType: string;
  storage: string;
  media: string;
  user: MediaQueueUserDto
}