export interface DriveFile {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  teamDriveId: string;
  driveId: string;
  size: string;
  trashed?: boolean;
}