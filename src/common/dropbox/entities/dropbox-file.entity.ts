import { SharedLink } from './shared-link.entity';

export class DropboxFile {
  name: string;
  path: string;
  size: number;

  constructor(sharedLink: SharedLink) {
    this.name = sharedLink.name;
    this.path = sharedLink.url.split('?')[0].split('/').slice(-2).join('/');
    this.size = sharedLink.size;
  }
}