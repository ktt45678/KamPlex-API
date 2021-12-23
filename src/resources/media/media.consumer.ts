import { Processor, OnGlobalQueueActive, OnGlobalQueueFailed, OnGlobalQueueCompleted, OnGlobalQueueProgress } from '@nestjs/bull';

import { MediaService } from './media.service';
import { TaskQueue } from '../../enums/task-queue.enum';
import { AddMediaStreamDto } from './dto/add-media-stream.dto';
import { MediaQueueStatusDto } from './dto/media-queue-status.dto';

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
      if (progress.episode) {
        console.log(`Adding quality ${progress.quality} and codec ${progress.codec} to media ${progress.media}, episode ${progress.episode}`);
        return await this.mediaService.addTVEpisodeStream(progress);
      }
      console.log(`Adding quality ${progress.quality} and codec ${progress.codec} to media ${progress.media}`);
      return await this.mediaService.addMovieStream(progress);
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueCompleted()
  async onGlobalCompleted(jobId: number, data: string) {
    try {
      const infoData: MediaQueueStatusDto = JSON.parse(data);
      console.log(`Job finished: ${jobId}`);
      if (infoData.episode) {
        await this.mediaService.handleTVEpisodeStreamQueueDone(infoData);
        return;
      }
      await this.mediaService.handleMovieStreamQueueDone(infoData);
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueFailed()
  async onGlobalFailed(jobId: number, err: string) {
    try {
      const errData: MediaQueueStatusDto = JSON.parse(err);
      console.log(`Found an error on job ${jobId}: ${errData.code}`);
      if (errData.episode) {
        await this.mediaService.handleTVEpisodeStreamQueueError(errData);
        return;
      }
      await this.mediaService.handleMovieStreamQueueError(errData);
    } catch (e) {
      console.error(e);
    }
  }
}
