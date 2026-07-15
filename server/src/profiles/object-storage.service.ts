import { CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.S3_BUCKET ?? "escalera-profiles";
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER ?? "escalera-local",
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "change-me-for-local-development"
    }
  });
  private bucketReady?: Promise<void>;

  async putProfileImage(key: string, body: Buffer) {
    await this.ensureBucket();
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp"
    }));
  }

  async getProfileImage(key: string) {
    await this.ensureBucket();
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body?.transformToByteArray();
  }

  async deleteProfileImages(keys: string[]) {
    if (!keys.length) return;
    await this.ensureBucket();
    await this.client.send(new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true }
    }));
  }

  private ensureBucket() {
    this.bucketReady ??= this.ensureBucketOnce();
    return this.bucketReady;
  }

  private async ensureBucketOnce() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
