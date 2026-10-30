import { ExternalStorage } from '../../schemas/external-storage.schema';

export type ExternalStorageAccess = Omit<ExternalStorage, 'files'> & { _decrypted?: boolean };
