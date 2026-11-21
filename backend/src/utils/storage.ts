import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';
import logger from './logger';

interface UploadOptions {
  filename: string;
  contentType: string;
  data: Buffer;
  metadata?: Record<string, string>;
}

interface StorageProvider {
  upload(options: UploadOptions): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

// AWS S3 Implementation
class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.client = new S3Client({
      region: config.storage.aws.region,
      credentials: {
        accessKeyId: config.storage.aws.accessKeyId || '',
        secretAccessKey: config.storage.aws.secretAccessKey || '',
      },
    });
    this.bucketName = config.storage.aws.bucketName || 'autoshorts-videos';
  }

  async upload(options: UploadOptions): Promise<string> {
    try {
      const key = `videos/${Date.now()}-${options.filename}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: options.data,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await this.client.send(command);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      logger.error({ error }, 'S3 upload failed');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ error, key }, 'S3 delete failed');
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ error, key }, 'Failed to generate signed URL');
      throw error;
    }
  }
}

// Cloudflare R2 Implementation
class CloudflareR2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;
  private endpoint: string;

  constructor() {
    this.endpoint = config.storage.cloudflare.endpoint || '';
    this.bucketName = config.storage.cloudflare.bucketName || 'autoshorts-videos';
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: config.storage.cloudflare.accessKeyId || '',
        secretAccessKey: config.storage.cloudflare.secretAccessKey || '',
      },
    });
  }

  async upload(options: UploadOptions): Promise<string> {
    try {
      const key = `videos/${Date.now()}-${options.filename}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: options.data,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await this.client.send(command);
      return `${this.endpoint}/${this.bucketName}/${key}`;
    } catch (error) {
      logger.error({ error }, 'R2 upload failed');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ error, key }, 'R2 delete failed');
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ error, key }, 'Failed to generate signed URL');
      throw error;
    }
  }
}

export function getStorageProvider(): StorageProvider {
  if (config.storage.type === 'r2') {
    return new CloudflareR2StorageProvider();
  }
  return new S3StorageProvider();
}
