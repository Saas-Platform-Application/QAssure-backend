/**
 * Object Storage Constants & Helpers — QAssure Platform
 *
 * Shared by file-attachment.service (which builds the actual providers) and
 * tenant-storage-bucket.service (which validates/persists bucket configs).
 * Kept in its own module so neither service has to require the other.
 */

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * Supported storage backends. Must stay in sync with the chk_storage_type
 * CHECK constraint on tenant_storage_buckets (migrations 103 / 106 / 110).
 */
const STORAGE_TYPES = ['azure', 'local', 's3', 'gcp', 'e2e'];

/**
 * Every backend except 'local' serves bytes over the network and therefore
 * exposes getSignedUrl()/getStream() instead of an on-disk path.
 */
const CLOUD_PROVIDER_TYPES = new Set(['azure', 's3', 'gcp', 'e2e']);

const isCloudProviderType = (type) => CLOUD_PROVIDER_TYPES.has(type);

// ============================================================================
// E2E NETWORKS OBJECT STORAGE (EOS / Vyoma)
//
// EOS is an S3-compatible object store, driven through the AWS SDK with a
// custom endpoint. Docs:
//   https://docs.e2enetworks.com/docs/myaccount/storage/object_storage/
// ============================================================================

/** Default (region-agnostic) S3 API endpoint for E2E Object Storage. */
const E2E_DEFAULT_ENDPOINT = 'https://objectstore.e2enetworks.net';

/**
 * EOS does not use AWS regions, but SigV4 requires *some* region label to sign
 * with. 'us-east-1' is the conventional placeholder for S3-compatible stores.
 */
const E2E_DEFAULT_REGION = 'us-east-1';

/**
 * Known EOS endpoints, offered as presets in the UI. Users can still type any
 * custom endpoint (e.g. a private/VPC endpoint) instead of choosing one.
 */
const E2E_KNOWN_ENDPOINTS = [
  { value: 'https://objectstore.e2enetworks.net',     label: 'Default — objectstore.e2enetworks.net' },
  { value: 'https://mum-objectstore.e2enetworks.net', label: 'Mumbai — mum-objectstore.e2enetworks.net' },
  { value: 'https://ndl-objectstore.e2enetworks.net', label: 'Delhi — ndl-objectstore.e2enetworks.net' },
];

/**
 * Normalize a user-supplied endpoint into a canonical scheme-qualified origin.
 *
 *   ''                                        -> https://objectstore.e2enetworks.net
 *   'objectstore.e2enetworks.net'             -> https://objectstore.e2enetworks.net
 *   'https://mum-objectstore.e2enetworks.net/'-> https://mum-objectstore.e2enetworks.net
 */
function normalizeE2EEndpoint(endpoint) {
  const raw = (endpoint || '').trim();
  if (!raw) return E2E_DEFAULT_ENDPOINT;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * Validate an EOS bucket name against S3 bucket naming rules, which EOS
 * follows: 3-63 chars, lowercase letters/digits/hyphens/dots, must start and
 * end alphanumeric, and must not look like an IP address.
 * Returns an error message, or null when the name is valid.
 */
function validateBucketName(name) {
  const value = (name || '').trim();
  if (value.length < 3 || value.length > 63) {
    return 'Bucket name must be between 3 and 63 characters';
  }
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value)) {
    return 'Bucket name may only contain lowercase letters, numbers, hyphens and dots, and must start and end with a letter or number';
  }
  if (/\.\./.test(value)) {
    return 'Bucket name must not contain consecutive dots';
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return 'Bucket name must not be formatted as an IP address';
  }
  return null;
}

module.exports = {
  STORAGE_TYPES,
  CLOUD_PROVIDER_TYPES,
  isCloudProviderType,
  E2E_DEFAULT_ENDPOINT,
  E2E_DEFAULT_REGION,
  E2E_KNOWN_ENDPOINTS,
  normalizeE2EEndpoint,
  validateBucketName,
};
