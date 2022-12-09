import { Snowflake } from 'nodejs-snowflake';

import { SNOWFLAKE_EPOCH, SNOWFLAKE_MACHINE_ID } from '../config';

const uid = new Snowflake({
  custom_epoch: SNOWFLAKE_EPOCH,
  instance_id: SNOWFLAKE_MACHINE_ID
});

export function createSnowFlakeId() {
  return new Promise<string>((resolve) => {
    const id = uid.getUniqueID();
    resolve(id.toString());
  });
}

/*
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
*/
