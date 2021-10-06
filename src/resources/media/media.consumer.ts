import { Processor, OnGlobalQueueActive, OnGlobalQueueError, OnGlobalQueueFailed, OnGlobalQueueCompleted, OnGlobalQueueProgress } from '@nestjs/bull';

import { MediaService } from './media.service';
import { TaskQueue } from '../../enums/task-queue.enum';
import { AddMediaStreamDto } from './dto/add-media-stream.dto';
import { MediaQueueStatus } from './dto/media-queue-status.dto';

@Processor(TaskQueue.VIDEO_TRANSCODE)
export class MediaCosumer {
  constructor(private readonly mediaService: MediaService) { }

  @OnGlobalQueueActive()
  onGlobalActive(jobId: number) {
    console.log(`Processing job ${jobId}`);
  }

  @OnGlobalQueueProgress()
  async onGlobalProgress(jobId: number, progress: AddMediaStreamDto) {
    try {
      console.log(`Adding quality ${progress.quality} and codec ${progress.codec} to media ${progress.media}`);
      return await this.mediaService.addMovieStream(progress);
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueCompleted()
  onGlobalCompleted(jobId: number, data: string) {
    try {
      const infoData: MediaQueueStatus = JSON.parse(data);
      console.log(`Job finished: ${jobId}`);
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueFailed()
  async onGlobalFailed(jobId: number, err: string) {
    try {
      const errData: MediaQueueStatus = JSON.parse(err);
      console.log(`Found an error on job ${jobId}: ${errData.code}`);
      await this.mediaService.handleMovieStreamQueueError(errData);
    } catch (e) {
      console.error(e);
    }
  }
}
