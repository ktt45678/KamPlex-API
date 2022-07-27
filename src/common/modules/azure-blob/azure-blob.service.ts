import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient } from '@azure/storage-blob';

import { AzureStorageContainer } from '../../../enums';

@Injectable()
export class AzureBlobService implements OnModuleInit {
  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    const blobClientService = BlobServiceClient.fromConnectionString(connectionString);
    Object.values(AzureStorageContainer).forEach(async container => {
      const containerClient = blobClientService.getContainerClient(container);
      try {
        await containerClient.createIfNotExists();
      } catch (error) {
        console.error(error);
      }
    });
  }

  async upload(container: string, filename: string, filePath: string, mimeType: string) {
    const blobClientService = BlobServiceClient.fromConnectionString(this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING'));
    const containerClient = blobClientService.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(filename);
    await blobClient.uploadFile(filePath, {
      blobHTTPHeaders: { blobContentType: mimeType }
    });
    return blobClient.getProperties();
  }

  delete(container: string, filename: string) {
    const blobClientService = BlobServiceClient.fromConnectionString(this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING'));
    const containerClient = blobClientService.getContainerClient(container);
    if (containerClient.exists()) {
      return containerClient.deleteBlob(filename);
    }
  }

}
