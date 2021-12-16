import { UniqueID } from 'nodejs-snowflake';
import { SNOWFLAKE_MACHINE_ID } from '../config';

export class SnowFlakeId {
  private uid: UniqueID;

  constructor() {
    this.uid = new UniqueID({
      returnNumber: true,
      machineID: SNOWFLAKE_MACHINE_ID
    });
  }

  create() {
    const id = this.uid.getUniqueID();
    return id.toString();
  }

  async createAsync() {
    const id = await this.uid.asyncGetUniqueID();
    return id.toString();
  }
}

const uid = new UniqueID({
  returnNumber: true,
  machineID: SNOWFLAKE_MACHINE_ID
});

export async function createSnowFlakeIdAsync() {
  const id = await uid.asyncGetUniqueID();
  return id.toString();
}