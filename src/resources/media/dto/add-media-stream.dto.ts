export class AddMediaStreamDto {
  sourceId: string;
  streamId: string;
  fileName: string;
  codec: number;
  quality: number;
  media: string;
  episode?: string;
  storage: string;
}