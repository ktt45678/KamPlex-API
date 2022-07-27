import { FileInfo } from './file-info.interface';
import { FileParent } from './file-parent.interface';

export interface DriveFile {
  id: string;
  name: string;
  file: FileInfo;
  parentReference: FileParent;
  size: number;
}