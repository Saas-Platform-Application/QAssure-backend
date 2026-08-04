# E2E Networks Object Storage (EOS / Vyoma) — QAssure Integration

E2E Object Store (EOS) is E2E Networks' **S3-compatible** object storage service.
QAssure drives it through the same AWS SDK used for Amazon S3, so no additional
dependency is required — only a custom endpoint and path-style bucket addressing.

Reference: <https://docs.e2enetworks.com/docs/myaccount/storage/object_storage/>

---

## 1. What EOS gives you

| Property | Value |
| --- | --- |
| API | S3-compatible (SigV4) |
| Default S3 endpoint | `objectstore.e2enetworks.net` |
| Regional endpoints | `mum-objectstore.e2enetworks.net` (Mumbai), `ndl-objectstore.e2enetworks.net` (Delhi) |
| DNS-style bucket host | `%(bucket)s.objectstore.e2enetworks.net` |
| Credentials | Access Key + Secret Key, created in MyAccount → Object Storage |
| Region | Not used by EOS; a region label is still needed for SigV4 signing (`us-east-1` by default) |

Because EOS speaks S3, any S3-compatible client works: `s3cmd`, MinIO `mc`,
`boto3`, and the AWS SDK for JavaScript that QAssure uses.

---

## 2. Provisioning on E2E Cloud

1. Sign in to **E2E MyAccount**.
2. Go to **Storage → Object Storage** and create a bucket
   (name must be 3–63 chars, lowercase letters/digits/hyphens/dots).
3. Open the bucket's **Access Keys** section and create a key pair.
   Copy the **Access Key** and **Secret Key** — the secret is shown once.
4. Note which endpoint your bucket is served from (default or a regional host).

---

## 3. Configuring a bucket in QAssure (recommended)

Per-tenant buckets live in the database and are managed from the UI. Secrets are
encrypted at rest with AES-256-GCM using the platform `ENCRYPTION_KEY` and are
never returned in plaintext by the API.

1. Sign in as SuperAdmin → **Settings → Storage Buckets → New Bucket**.
2. Set **Storage Type** to *E2E Networks Object Storage (EOS)*.
3. Fill in:
   - **Bucket Name** — the EOS bucket you created
   - **S3 Endpoint** — pick a preset or choose *Custom endpoint…*
   - **Signing Region** — leave as `us-east-1` unless you have a reason to change it
   - **Access Key** / **Secret Key** — from step 2 above
   - **Use path-style addressing** — leave checked (see §5)
4. Click **Test Connection** to verify the credentials and endpoint reach the
   bucket before saving.
5. Save, then assign the bucket to a tenant via **Assign to Tenant**.

Uploads for that tenant now land in EOS at:

```
<bucket>/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext
```

Downloads and previews are served through short-lived presigned URLs (1 hour).

### Changing a tenant's bucket is safe

Every blob records the `bucket_config_id` it was written to. Reassigning a
tenant to a different bucket only affects **new** uploads — existing files are
still read from the bucket they were originally written to.

---

## 4. Configuring EOS via environment variables (fallback only)

Per-tenant buckets take precedence for all normal uploads. These variables only
drive the fallback provider used when no tenant bucket applies (for example
legacy blobs written before per-tenant bucket configs existed).

```bash
STORAGE_TYPE=e2e

E2E_OBJECT_STORAGE_BUCKET=qassure-eos-files
E2E_OBJECT_STORAGE_ENDPOINT=https://objectstore.e2enetworks.net
E2E_OBJECT_STORAGE_REGION=us-east-1
E2E_OBJECT_STORAGE_ACCESS_KEY=<access key>
E2E_OBJECT_STORAGE_SECRET_KEY=<secret key>
E2E_OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

---

## 5. Path-style vs DNS-style addressing

| Style | Request URL | When to use |
| --- | --- | --- |
| Path-style (default) | `https://objectstore.e2enetworks.net/<bucket>/<key>` | Always works; the safe default |
| DNS-style | `https://<bucket>.objectstore.e2enetworks.net/<key>` | Only when the bucket resolves as a sub-domain and the endpoint's TLS certificate covers it |

Uncheck **Use path-style addressing** (or set
`E2E_OBJECT_STORAGE_FORCE_PATH_STYLE=false`) to switch to DNS-style.

---

## 6. Implementation map

| Concern | Location |
| --- | --- |
| Endpoint normalisation, defaults, bucket-name rules | `src/utils/object-storage.js` |
| `S3CompatibleStorageProvider` base + `E2EObjectStorageProvider` | `src/services/file-attachment.service.js` |
| Bucket-row → provider resolution | `FileAttachmentService._buildProviderFromBucketRow` |
| Config CRUD, encryption, masking, `testConnection` | `src/services/tenant-storage-bucket.service.js` |
| HTTP endpoints | `src/routes/tenant-storage-bucket.routes.js` |
| Schema | `src/migrations/110_add_e2e_object_storage_type.js` |
| Frontend labels, endpoint presets | `src/constants/storage.ts` (frontend repo) |
| Bucket form + connection test UI | `src/pages/superadmin/StorageBuckets.tsx` (frontend repo) |

`E2EObjectStorageProvider` implements the full storage-provider surface:
`save`, `delete`, `exists`, `getFullPath`, `read`, `getStream`, `getSignedUrl`,
and `testConnection`.

### Schema columns (`tenant_storage_buckets`)

| Column | Type | Notes |
| --- | --- | --- |
| `e2e_bucket` | `VARCHAR(255)` | EOS bucket name |
| `e2e_endpoint` | `TEXT` | Normalised to a scheme-qualified origin |
| `e2e_region` | `VARCHAR(100)` | SigV4 signing label only |
| `e2e_access_key` | `VARCHAR(255)` | Not a secret (mirrors `s3_access_key_id`) |
| `e2e_secret_key` | `TEXT` | Encrypted AES-256-GCM |
| `e2e_force_path_style` | `BOOLEAN` | Defaults to `TRUE` |

---

## 7. Connection test API

```http
POST /api/v1/storage-buckets/test-connection      # unsaved config
POST /api/v1/storage-buckets/:id/test-connection  # saved config, body may override fields
```

For a saved bucket the secret may be omitted from the body — the stored
encrypted value is used, so the UI never has to re-send it.

Success:

```json
{
  "success": true,
  "data": {
    "success": true,
    "storage_type": "e2e",
    "target": "https://objectstore.e2enetworks.net/qassure-eos-files"
  }
}
```

Failure returns `400 TEST_CONNECTION_FAILED` with the underlying S3 error message.

---

## 8. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `SignatureDoesNotMatch` | Wrong secret key, or the signing region was changed away from the one the keys were issued against |
| `NoSuchBucket` | Bucket name typo, or the bucket lives behind a different regional endpoint |
| `AccessDenied` on `HeadBucket` | Access key lacks permission on the bucket |
| DNS/`ENOTFOUND` errors with path-style off | DNS-style addressing requires the bucket to resolve as a sub-domain — re-enable path-style |
| `getaddrinfo ENOTFOUND` | Endpoint hostname typo, or egress to `*.e2enetworks.net` is blocked |
