import { jest } from '@jest/globals';
import { ObjectMediaStorage } from './object-media-storage';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { Response } from 'express';

describe('Persistent demo media', () => {
  const name = '12345678-1234-1234-1234-123456789abc.mp3';
  const send = jest.fn<(...args: any[]) => Promise<any>>();
  const store = new ObjectMediaStorage({ send } as unknown as S3Client, 'private-demo');
  beforeEach(() => send.mockReset());
  it('stores uploads under the application prefix without public ACLs', async () => {
    await store.put(name, Buffer.from('ID3'));
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({ Bucket: 'private-demo', Key: `uploads/listening/${name}`, Body: Buffer.from('ID3'), ContentType: 'audio/mpeg' });
    await expect(store.put('../other.mp3', Buffer.from('x'))).rejects.toThrow();
  });
  it('preserves partial-content playback and byte counts', async () => {
    send.mockResolvedValue({ Body: { transformToByteArray: async () => Uint8Array.from([1, 2]) }, ContentLength: 2, ContentRange: 'bytes 0-1/10' });
    const response = { setHeader: jest.fn(), status: jest.fn(), send: jest.fn() };
    response.status.mockReturnValue(response);
    await store.serve(name, response as unknown as Response, 'bytes=0-1');
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input.Range).toBe('bytes=0-1');
    expect(response.status).toHaveBeenCalledWith(206);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Range', 'bytes 0-1/10');
    expect(response.send).toHaveBeenCalledWith(Buffer.from([1, 2]));
  });
  it('rejects multi-range requests and hides storage failure details', async () => {
    await expect(store.serve(name, {} as Response, 'bytes=0-1,2-3')).rejects.toThrow('Khoảng audio');
    expect(send).not.toHaveBeenCalled();
    send.mockRejectedValue(new Error('private endpoint or credential details'));
    await expect(store.serve(name, {} as Response)).rejects.toThrow('Kho audio tạm thời');
    send.mockRejectedValue({ name: 'NoSuchKey' });
    await expect(store.serve(name, {} as Response)).rejects.toThrow('Không tìm thấy audio');
  });
});
