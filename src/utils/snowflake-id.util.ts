import { UniqueID } from 'nodejs-snowflake';

export class SnowFlakeId {
  private uid: UniqueID;

  constructor() {
    this.uid = new UniqueID({
      returnNumber: true,
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