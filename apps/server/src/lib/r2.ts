import { env } from "@CMLP/env/server";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-API-compatible, so the standard AWS SDK works against it once pointed
// at the account's R2 endpoint. All four env vars are optional — when unset, storage is
// simply not available and callers fall back to metadata-only documents (see documents.ts).
export const isR2Configured = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME,
);

const client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const PRESIGN_EXPIRY_SECONDS = 15 * 60;

export function buildStorageKey(clientId: string, documentId: string, fileName: string) {
  return `${clientId}/${documentId}-${fileName}`;
}

export async function getUploadUrl(storageKey: string, contentType?: string) {
  if (!client) return null;
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

export async function getDownloadUrl(storageKey: string) {
  if (!client) return null;
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

// Fetches an object's raw bytes directly (no presigned round trip) — used server-side by
// the OCR pipeline, which needs the actual file content rather than a client-facing URL.
export async function getObjectBytes(storageKey: string): Promise<Uint8Array | null> {
  if (!client) return null;
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storageKey });
  const result = await client.send(command);
  if (!result.Body) return null;
  return result.Body.transformToByteArray();
}
