import { SetMetadata } from '@nestjs/common';

import { ON_PUBSUB_MESSAGE_EVENT_METADATA } from '../redis-pubsub.constants';

export interface OnPubSubMessageEventMetadata {
  channel: string;
}

export const OnPubSubMessage = (
  channel: string,
): MethodDecorator =>
  SetMetadata(ON_PUBSUB_MESSAGE_EVENT_METADATA, {
    channel: channel,
  } as OnPubSubMessageEventMetadata);
