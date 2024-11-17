import { Logger } from '@nestjs/common';
import { InjectQueue, OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';

import { MediaQueueResultDto } from './dto';
import { MediaService } from './media.service';
import { TaskQueue, VideoCodec } from '../../enums';

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H264}`)
export class MediaConsumerH264 extends QueueEventsHost {
  private readonly logger = new Logger(MediaConsumerH264.name);

  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H264}`) private videoTranscodeH264Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    this.logger.log(`Processing job ${jobId} of type H264`);
  }

  @OnQueueEvent('completed')
  async onGlobalCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Job finished: ${jobId}`);
    await this.videoTranscodeH264Queue.remove(jobId);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    this.logger.error(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeH264Queue.getJob(jobId);
    await this.videoTranscodeH264Queue.remove(jobId);
    if (!job || job.data?.errorCode) return; // Stop if the error has already beed handled
    this.logger.log(`Cleanning failed job ${jobId}`);
    const jobData = plainToInstance(MediaQueueResultDto, { jobId: job.id, ...job.data });
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H265}`)
export class MediaConsumerH265 extends QueueEventsHost {
  private readonly logger = new Logger(MediaConsumerH265.name);

  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.H265}`) private videoTranscodeH265Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    this.logger.log(`Processing job ${jobId} of type H265`);
  }

  @OnQueueEvent('completed')
  async onGlobalCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Job finished: ${jobId}`);
    await this.videoTranscodeH265Queue.remove(jobId);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    this.logger.error(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeH265Queue.getJob(jobId);
    await this.videoTranscodeH265Queue.remove(jobId);
    if (!job || job.data?.errorCode) return;
    this.logger.log(`Cleanning failed job ${jobId}`);
    const jobData = plainToInstance(MediaQueueResultDto, { jobId: job.id, ...job.data });
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.VP9}`)
export class MediaConsumerVP9 extends QueueEventsHost {
  private readonly logger = new Logger(MediaConsumerVP9.name);

  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.VP9}`) private videoTranscodeVP9Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    this.logger.log(`Processing job ${jobId} of type VP9`);
  }

  @OnQueueEvent('completed')
  async onGlobalCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Job finished: ${jobId}`);
    await this.videoTranscodeVP9Queue.remove(jobId);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    this.logger.error(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeVP9Queue.getJob(jobId);
    await this.videoTranscodeVP9Queue.remove(jobId);
    if (!job || job.data?.errorCode) return;
    this.logger.log(`Cleanning failed job ${jobId}`);
    const jobData = plainToInstance(MediaQueueResultDto, { jobId: job.id, ...job.data });
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}

@QueueEventsListener(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.AV1}`)
export class MediaConsumerAV1 extends QueueEventsHost {
  private readonly logger = new Logger(MediaConsumerAV1.name);

  constructor(@InjectQueue(`${TaskQueue.VIDEO_TRANSCODE}:${VideoCodec.AV1}`) private videoTranscodeAV1Queue: Queue,
    private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  onGlobalActive({ jobId }: { jobId: string }) {
    this.logger.log(`Processing job ${jobId} of type AV1`);
  }

  @OnQueueEvent('completed')
  async onGlobalCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Job finished: ${jobId}`);
    await this.videoTranscodeAV1Queue.remove(jobId);
  }

  @OnQueueEvent('failed')
  async onGlobalFailed({ jobId, failedReason }: { jobId: string, failedReason: string }) {
    this.logger.error(`Found an error on job ${jobId}: ${failedReason}`);
    const job = await this.videoTranscodeAV1Queue.getJob(jobId);
    await this.videoTranscodeAV1Queue.remove(jobId);
    if (!job || job.data?.errorCode) return;
    this.logger.log(`Cleanning failed job ${jobId}`);
    const jobData = plainToInstance(MediaQueueResultDto, { jobId: job.id, ...job.data });
    if (jobData.episode) {
      await this.mediaService.handleTVEpisodeStreamQueueError(jobData.jobId, jobData);
    } else {
      await this.mediaService.handleMovieStreamQueueError(jobData.jobId, jobData);
    }
  }
}
