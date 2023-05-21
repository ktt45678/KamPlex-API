import { InjectQueue, OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { MediaQueueResultDto } from './dto';
import { MediaService } from './media.service';
import { TaskQueue, VideoCodec } from '../../enums';

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H264}`)
export class MediaConsumerH264 extends QueueEventsHost {
  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H264}`) private videoTranscodeH264Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    console.log(`Processing job ${jobId} of type H264`);
  }

  @OnQueueEvent('completed')
  onGlobalCompleted({ jobId }: { jobId: string }) {
    console.log(`Job finished: ${jobId}`);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    console.log(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeH264Queue.getJob(jobId);
    if (!job || job.data?.errorCode) return; // Stop if the error has already beed handled
    console.log(`Cleanning failed job ${jobId}`);
    const jobData: MediaQueueResultDto = { jobId: job.id, ...job.data };
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.VP9}`)
export class MediaConsumerVP9 extends QueueEventsHost {
  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.VP9}`) private videoTranscodeVP9Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    console.log(`Processing job ${jobId} of type VP9`);
  }

  @OnQueueEvent('completed')
  onGlobalCompleted({ jobId }: { jobId: string }) {
    console.log(`Job finished: ${jobId}`);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    console.log(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeVP9Queue.getJob(jobId);
    if (!job || job.data?.errorCode) return;
    console.log(`Cleanning failed job ${jobId}`);
    const jobData: MediaQueueResultDto = { jobId: job.id, ...job.data };
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.AV1}`)
export class MediaConsumerAV1 extends QueueEventsHost {
  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.AV1}`) private videoTranscodeAV1Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    console.log(`Processing job ${jobId} of type AV1`);
  }

  @OnQueueEvent('completed')
  onGlobalCompleted({ jobId }: { jobId: string }) {
    console.log(`Job finished: ${jobId}`);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    console.log(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeAV1Queue.getJob(jobId);
    if (!job || job.data?.errorCode) return;
    console.log(`Cleanning failed job ${jobId}`);
    const jobData: MediaQueueResultDto = { jobId: job.id, ...job.data };
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}
