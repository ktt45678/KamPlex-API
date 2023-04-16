import { Processor, OnGlobalQueueActive, OnGlobalQueueFailed, OnGlobalQueueCompleted, OnGlobalQueueProgress } from '@nestjs/bull';

import { MediaService } from './media.service';
import { AddMediaStreamDto } from './dto/add-media-stream.dto';
import { MediaQueueStatusDto } from './dto/media-queue-status.dto';
import { TaskQueue, QueueStatus, QueueProgressCode } from '../../enums';
import { plainToInstance } from 'class-transformer';

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
      progress = plainToInstance(AddMediaStreamDto, progress);
      switch (progress.code) {
        case QueueProgressCode.UPDATE_SOURCE: {
          let message = `Updating source ${progress.quality} of media ${progress.media}`;
          if (progress.episode)
            message += `, episode ${progress.episode}`;
          console.log(message);
          await this.mediaService.updateMediaSourceData(progress);
          break;
        }
        /*
        case QueueProgressCode.ADD_STREAM_AUDIO: {
          if (progress.episode) {
            console.log(`Adding audio with ${progress.channels} channels to media ${progress.media}, episode ${progress.episode}`);
            await this.mediaService.addTVEpisodeAudioStream(progress);
          } else {
            console.log(`Adding audio with ${progress.channels} channels to media ${progress.media}`);
            return await this.mediaService.addMovieAudioStream(progress);
          }
          break;
        }
        */
        case QueueProgressCode.ADD_STREAM_VIDEO: {
          if (progress.episode) {
            console.log(`Adding quality ${progress.quality} and codec ${progress.codec} to media ${progress.media}, episode ${progress.episode}`);
            await this.mediaService.addTVEpisodeStream(progress);
          } else {
            console.log(`Adding quality ${progress.quality} and codec ${progress.codec} to media ${progress.media}`);
            return await this.mediaService.addMovieStream(progress);
          }
          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueCompleted()
  async onGlobalCompleted(jobId: number, data: string) {
    try {
      const infoData = plainToInstance(MediaQueueStatusDto, JSON.parse(data));
      if (infoData.cancel) return;
      if (infoData.code === QueueStatus.CANCELLED_ENCODING) {
        console.log(`Job cancelled: ${jobId}`);
        return;
      }
      console.log(`Job finished: ${jobId}`);
      if (infoData.episode) {
        await this.mediaService.handleTVEpisodeStreamQueueDone(jobId, infoData);
        return;
      }
      await this.mediaService.handleMovieStreamQueueDone(jobId, infoData);
    } catch (e) {
      console.error(e);
    }
  }

  @OnGlobalQueueFailed()
  async onGlobalFailed(jobId: number, err: string) {
    let errData: MediaQueueStatusDto | string;
    try {
      errData = plainToInstance(MediaQueueStatusDto, JSON.parse(err));
    } catch {
      errData = err;
    }
    try {
      if (typeof errData === 'string') {
        console.log(errData);
      } else {
        console.log(`Found an error on job ${jobId}: ${errData.code}`);
        if (errData.episode) {
          await this.mediaService.handleTVEpisodeStreamQueueError(jobId, errData);
          return;
        }
        await this.mediaService.handleMovieStreamQueueError(jobId, errData);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
