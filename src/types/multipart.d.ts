namespace Storage {
  interface MultipartFile {
    filepath: string;
    fieldname: string;
    filename: string;
    encoding: string;
    mimetype: string;
    detectedMimetype?: string;
    color?: number;
    thumbhash?: string;
    isUrl?: boolean;
    fields: import('@fastify/multipart').MultipartFields;
  }
}
