import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { MediaService } from './media.service';
import { TaskQueue } from '../../enums';
import { plainToInstance } from 'class-transformer';
import { MediaQueueResultDto } from './dto';

type JobNameType = 'update-source' | 'add-stream-video' | 'add-stream-audio' | 'add-stream-manifest' | 'finished-encoding' |
  'cancelled-encoding' | 'failed-encoding';

@Processor(TaskQueue.VIDEO_TRANSCODE_RESULT, { concurrency: 1 })
export class MediaResultConsumer extends WorkerHost {
  constructor(private readonly mediaService: MediaService) {
    super();
  }

  async process(job: Job<MediaQueueResultDto, any, JobNameType>): Promise<any> {
    try {
      const jobData = plainToInstance(MediaQueueResultDto, job.data);
      switch (job.name) {
        case 'update-source': {
          let message = `Updating source ${jobData.progress.quality} of media ${jobData.media}`;
          if (jobData.episode)
            message += `, episode ${jobData.episode}`;
          console.log(message);
          await this.mediaService.updateMediaSourceData(jobData);
          break;
        }
        case 'add-stream-audio': {
          if (jobData.episode) {
            console.log(`Adding audio of codec ${jobData.progress.codec} to media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.addTVEpisodeAudioStream(jobData);
          } else {
            console.log(`Adding audio of codec ${jobData.progress.codec} to media ${jobData.media}`);
            await this.mediaService.addMovieAudioStream(jobData);
          }
          break;
        }
        case 'add-stream-video': {
          if (jobData.episode) {
            console.log(`Adding quality ${jobData.progress.quality} and codec ${jobData.progress.codec} to media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.addTVEpisodeStream(jobData);
          } else {
            console.log(`Adding quality ${jobData.progress.quality} and codec ${jobData.progress.codec} to media ${jobData.media}`);
            await this.mediaService.addMovieStream(jobData);
          }
          break;
        }
        case 'add-stream-manifest': {
          if (jobData.episode) {
            console.log(`Adding manifest of codec ${jobData.progress.codec} to media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.addTVEpisodeStreamManifest(jobData);
          } else {
            console.log(`Adding manifest of codec ${jobData.progress.codec} to media ${jobData.media}`);
            await this.mediaService.addMovieStreamManifest(jobData);
          }
          break;
        }
        case 'finished-encoding': {
          if (jobData.episode) {
            console.log(`Finished encoding media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.handleTVEpisodeStreamQueueDone(jobData.jobId, jobData);
          } else {
            console.log(`Finished encoding media ${jobData.media}`);
            await this.mediaService.handleMovieStreamQueueDone(jobData.jobId, jobData);
          }
          break;
        }
        case 'cancelled-encoding': {
          if (jobData.keepStreams) // If Everything is already encoded
            break;
          if (jobData.episode) {
            console.log(`Cancelled encoding media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.handleTVEpisodeStreamQueueCancel(jobData.jobId, jobData);
          } else {
            console.log(`Cancelled encoding media ${jobData.media}`);
            await this.mediaService.handleMovieStreamQueueCancel(jobData.jobId, jobData);
          }
          break;
        }
        case 'failed-encoding': {
          if (jobData.episode) {
            console.log(`Failed encoding media ${jobData.media}, episode ${jobData.episode}`);
            await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
          } else {
            console.log(`Failed encoding media ${jobData.media}`);
            await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
          }
        }
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    return {};
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of result type ${job.name}`);
  }
}
