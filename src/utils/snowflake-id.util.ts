import { SNOWFLAKE_EPOCH, SNOWFLAKE_MACHINE_ID } from '../config';

// 42 bits timestamp, 12 bits instance id, 10 bits sequence
const INSTANCE_ID_BITS = 12;
const SEQUENCE_BITS = 10;
const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;
const MAX_INSTANCE_ID = (1 << INSTANCE_ID_BITS) - 1;
const INSTANCE_ID = BigInt(SNOWFLAKE_MACHINE_ID & MAX_INSTANCE_ID) << BigInt(SEQUENCE_BITS);
const TIMESTAMP_SHIFT = BigInt(INSTANCE_ID_BITS + SEQUENCE_BITS);

let lastTimestamp = -1;
let sequence = 0;
let timestampPart = BigInt(0);

export function createSnowFlakeId() {
  // Never goes back in time, a clock moved backward cannot repeat ids
  let timestamp = Math.max(Date.now() - SNOWFLAKE_EPOCH, lastTimestamp);
  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1) & MAX_SEQUENCE;
    // Out of ids for this ms, take the next one instead of waiting
    if (sequence === 0)
      timestamp++;
  } else {
    sequence = 0;
  }
  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp;
    timestampPart = (BigInt(timestamp) << TIMESTAMP_SHIFT) | INSTANCE_ID;
  }
  return timestampPart | BigInt(sequence);
}

export function getSnowFlakeTimestamp(id: bigint, epoch: number = SNOWFLAKE_EPOCH) {
  return Number(id >> TIMESTAMP_SHIFT) + epoch;
}

export function getSnowFlakeInstanceId(id: bigint) {
  return Number((id >> BigInt(SEQUENCE_BITS)) & BigInt(MAX_INSTANCE_ID));
}
