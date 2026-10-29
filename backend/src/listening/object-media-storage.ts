import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';

const validName = /^[a-f0-9-]{36}\.(wav|mp3|mp4|webm)$/;
const types: Record<string, string> = { wav: 'audio/wav', mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm' };

export class ObjectMediaStorage {
  constructor(private readonly client: Pick<S3Client, 'send'>, private readonly bucket: string) {}
  private key(name: string) {
    if (!validName.test(name)) throw new BadRequestException('Tên tài nguyên không hợp lệ.');
    return `uploads/listening/${name}`;
  }
  async put(name: string, data: Buffer) {
    const key = this.key(name);
    if (data.length > 20 * 1024 * 1024) throw new BadRequestException('Audio/video tối đa 20 MB.');
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data,
      ContentType: types[name.split('.').at(-1)!] }));
  }
  async serve(name: string, response: Response, range?: string) {
    const key = this.key(name);
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) throw new BadRequestException('Khoảng audio không hợp lệ.');
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }));
      if (!result.Body || (result.ContentLength ?? 0) > 20 * 1024 * 1024) throw new Error('Invalid media size');
      const bytes = Buffer.from(await result.Body.transformToByteArray());
      response.setHeader('Content-Type', types[name.split('.').at(-1)!]);
      response.setHeader('Content-Length', bytes.length);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (result.ContentRange) { response.status(206); response.setHeader('Content-Range', result.ContentRange); }
      if (result.ETag) response.setHeader('ETag', result.ETag);
      response.send(bytes);
    } catch (error) {
      const code = (error as { name?: string; $metadata?: { httpStatusCode?: number } });
      if (code.name === 'NoSuchKey' || code.$metadata?.httpStatusCode === 404) throw new NotFoundException('Không tìm thấy audio.');
      if (code.name === 'InvalidRange' || code.$metadata?.httpStatusCode === 416) { response.status(416).end(); return; }
      throw new ServiceUnavailableException('Kho audio tạm thời chưa sẵn sàng.');
    }
  }
}

let configured: ObjectMediaStorage | undefined;
export function objectMediaStorage() {
  if (!process.env.MEDIA_S3_BUCKET) return undefined;
  if (!configured) {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('HTTPS object storage endpoint required');
    configured = new ObjectMediaStorage(new S3Client({ endpoint, forcePathStyle: true,
      region: process.env.AWS_REGION || 'us-east-1' }), process.env.MEDIA_S3_BUCKET);
  }
  return configured;
}
