export interface DriveFile {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  teamDriveId: string;
  driveId: string;
  size: number;
  trashed?: boolean;
}