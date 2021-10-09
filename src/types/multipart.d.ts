namespace Storage {
  interface MultipartFile {
    toBuffer: () => Promise<Buffer>;
    file: NodeJS.ReadableStream;
    filepath: string;
    fieldname: string;
    filename: string;
    encoding: string;
    mimetype: string;
    detectedMimetype?: string;
    color?: number;
    isUrl?: boolean;
    fields: import('fastify-multipart').MultipartFields;
  }
}