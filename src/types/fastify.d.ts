import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    incomingFile: Storage.MultipartFile;
  }
}