import { DriveFile } from './drive-file.interface';

export interface DriveFileList {
  kind: string;
  incompleteSearch: boolean;
  files: DriveFile[];
}