import crypto from 'crypto';

export function createSecureHash(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`)
    .join('&');

  return crypto.createHmac('sha512', secret).update(sorted).digest('hex');
}

export function verifySecureHash(params: Record<string, string>, secret: string): boolean {
  const receivedHash = params.vnp_SecureHash;
  if (!receivedHash) return false;

  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') {
      filtered[k] = v;
    }
  }

  const computed = createSecureHash(filtered, secret);
  return receivedHash.toLowerCase() === computed.toLowerCase();
}
