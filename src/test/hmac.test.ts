/**
 * HMAC Utilities Unit Tests
 * Tests for webhook signature verification functions
 *
 * Functions tested:
 * - timingSafeEqual: Constant-time string comparison
 * - verifyHmacSignature: HMAC-SHA256 signature verification
 * - extractSignature: Header extraction from Request
 * - logWebhookAttempt: Audit logging to database
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============= Re-implement functions for browser testing =============
// Since the original functions are in Deno edge functions, we re-implement
// them here for browser-compatible testing with the same logic

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    if (!signature || !secret) {
      return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Handle sha256= prefix
    const cleanSignature = signature.replace(/^sha256=/i, '').toLowerCase();

    return timingSafeEqual(expectedSignature.toLowerCase(), cleanSignature);
  } catch (_error) {
    return false;
  }
}

/**
 * Extract signature from request headers
 */
function extractSignature(req: Request): string | null {
  const headerNames = [
    'X-Webhook-Signature',
    'X-InTouch-Signature',
    'X-Hub-Signature-256',
    'X-Signature',
  ];

  for (const headerName of headerNames) {
    const value = req.headers.get(headerName);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Log webhook attempt to database
 */
interface WebhookLogEntry {
  webhook_type: string;
  signature_valid: boolean;
  signature_provided: string | null;
  source_ip: string | null;
  payload: Record<string, unknown> | null;
  processing_result: string;
  error_message?: string | null;
}

interface MockSupabaseClient {
  from: (table: string) => {
    insert: (data: WebhookLogEntry) => Promise<{ error: Error | null }>;
  };
}

async function logWebhookAttempt(
  supabase: MockSupabaseClient,
  entry: WebhookLogEntry
): Promise<void> {
  try {
    await supabase.from('webhook_logs').insert(entry);
  } catch (_error) {
    // Silently fail - logging should not break webhook processing
  }
}

// ============= TESTS =============

describe('HMAC Utilities', () => {
  // ============= timingSafeEqual Tests =============
  describe('timingSafeEqual', () => {
    it('returns true for identical strings', () => {
      expect(timingSafeEqual('hello', 'hello')).toBe(true);
    });

    it('returns true for identical long strings', () => {
      const longString = 'a'.repeat(1000);
      expect(timingSafeEqual(longString, longString)).toBe(true);
    });

    it('returns false for strings of different lengths', () => {
      expect(timingSafeEqual('hello', 'hello!')).toBe(false);
    });

    it('returns false for same length but different characters', () => {
      expect(timingSafeEqual('hello', 'hallo')).toBe(false);
    });

    it('returns true for empty strings', () => {
      expect(timingSafeEqual('', '')).toBe(true);
    });

    it('returns false for empty vs non-empty string', () => {
      expect(timingSafeEqual('', 'a')).toBe(false);
    });

    it('handles special characters correctly', () => {
      expect(timingSafeEqual('!@#$%^&*()', '!@#$%^&*()')).toBe(true);
      expect(timingSafeEqual('!@#$%^&*()', '!@#$%^&*()!')).toBe(false);
    });

    it('handles unicode characters correctly', () => {
      expect(timingSafeEqual('héllo', 'héllo')).toBe(true);
      expect(timingSafeEqual('héllo', 'hello')).toBe(false);
    });

    it('handles hex strings (signature format)', () => {
      const sig1 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      const sig2 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      const sig3 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d5';
      expect(timingSafeEqual(sig1, sig2)).toBe(true);
      expect(timingSafeEqual(sig1, sig3)).toBe(false);
    });

    it('detects difference at the beginning', () => {
      expect(timingSafeEqual('Xello', 'hello')).toBe(false);
    });

    it('detects difference at the end', () => {
      expect(timingSafeEqual('hellX', 'hello')).toBe(false);
    });

    it('is case sensitive', () => {
      expect(timingSafeEqual('Hello', 'hello')).toBe(false);
    });
  });

  // ============= verifyHmacSignature Tests =============
  describe('verifyHmacSignature', () => {
    const testSecret = 'test-webhook-secret-key-2024';

    // Pre-computed HMAC-SHA256 signatures for known payloads
    // These were computed using: HMAC-SHA256(payload, secret)

    it('returns true for valid signature', async () => {
      const payload = 'test payload';
      // Generate expected signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifyHmacSignature(payload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', async () => {
      const payload = 'test payload';
      const invalidSignature = 'invalid123456789abcdef0123456789abcdef0123456789abcdef0123456789';

      const result = await verifyHmacSignature(payload, invalidSignature, testSecret);
      expect(result).toBe(false);
    });

    it('handles sha256= prefix in signature', async () => {
      const payload = 'test payload';
      // Generate expected signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifyHmacSignature(payload, `sha256=${validSignature}`, testSecret);
      expect(result).toBe(true);
    });

    it('is case insensitive for signature comparison', async () => {
      const payload = 'test';
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Test uppercase signature
      const result = await verifyHmacSignature(payload, validSignature.toUpperCase(), testSecret);
      expect(result).toBe(true);
    });

    it('returns false for empty signature', async () => {
      const result = await verifyHmacSignature('payload', '', testSecret);
      expect(result).toBe(false);
    });

    it('returns false for empty secret', async () => {
      const result = await verifyHmacSignature('payload', 'somesignature', '');
      expect(result).toBe(false);
    });

    it('returns false for null/undefined signature', async () => {
      const result = await verifyHmacSignature('payload', null as unknown as string, testSecret);
      expect(result).toBe(false);
    });

    it('handles empty payload with correct signature', async () => {
      const payload = '';
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifyHmacSignature(payload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('handles JSON payloads correctly', async () => {
      const payload = JSON.stringify({ transaction_id: '12345', amount: 5000, status: 'success' });
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifyHmacSignature(payload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('handles special characters in payload', async () => {
      const payload = 'Test with émojis 🔐 and spëcial çhars!';
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifyHmacSignature(payload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('returns false when payload is tampered', async () => {
      const originalPayload = 'original payload';
      const tamperedPayload = 'tampered payload';

      // Generate signature for original payload
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(originalPayload)
      );
      const originalSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Verify with tampered payload should fail
      const result = await verifyHmacSignature(tamperedPayload, originalSignature, testSecret);
      expect(result).toBe(false);
    });

    it('returns false for wrong secret', async () => {
      const payload = 'test payload';
      const wrongSecret = 'wrong-secret';

      // Generate signature with correct secret
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Verify with wrong secret should fail
      const result = await verifyHmacSignature(payload, validSignature, wrongSecret);
      expect(result).toBe(false);
    });
  });

  // ============= extractSignature Tests =============
  describe('extractSignature', () => {
    it('extracts X-Webhook-Signature header', () => {
      const req = new Request('https://example.com', {
        headers: { 'X-Webhook-Signature': 'sig123' },
      });
      expect(extractSignature(req)).toBe('sig123');
    });

    it('extracts X-InTouch-Signature header', () => {
      const req = new Request('https://example.com', {
        headers: { 'X-InTouch-Signature': 'intouch-sig456' },
      });
      expect(extractSignature(req)).toBe('intouch-sig456');
    });

    it('extracts X-Hub-Signature-256 header', () => {
      const req = new Request('https://example.com', {
        headers: { 'X-Hub-Signature-256': 'sha256=hubsig789' },
      });
      expect(extractSignature(req)).toBe('sha256=hubsig789');
    });

    it('extracts X-Signature header', () => {
      const req = new Request('https://example.com', {
        headers: { 'X-Signature': 'generic-sig' },
      });
      expect(extractSignature(req)).toBe('generic-sig');
    });

    it('returns null when no signature header present', () => {
      const req = new Request('https://example.com', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(extractSignature(req)).toBeNull();
    });

    it('respects header priority order (X-Webhook-Signature first)', () => {
      const req = new Request('https://example.com', {
        headers: {
          'X-Webhook-Signature': 'priority1',
          'X-InTouch-Signature': 'priority2',
          'X-Hub-Signature-256': 'priority3',
        },
      });
      expect(extractSignature(req)).toBe('priority1');
    });

    it('falls back to second priority when first is missing', () => {
      const req = new Request('https://example.com', {
        headers: {
          'X-InTouch-Signature': 'intouch-sig',
          'X-Hub-Signature-256': 'hub-sig',
        },
      });
      expect(extractSignature(req)).toBe('intouch-sig');
    });

    it('handles empty header value', () => {
      const req = new Request('https://example.com', {
        headers: { 'X-Webhook-Signature': '' },
      });
      // Empty string is falsy, so it should fall through
      expect(extractSignature(req)).toBeNull();
    });
  });

  // ============= logWebhookAttempt Tests =============
  describe('logWebhookAttempt', () => {
    let mockSupabase: MockSupabaseClient;
    let mockInsert: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };
    });

    it('inserts log entry successfully', async () => {
      const entry: WebhookLogEntry = {
        webhook_type: 'intouch',
        signature_valid: true,
        signature_provided: 'sha256=abc123',
        source_ip: '192.168.1.1',
        payload: { transaction_id: '12345' },
        processing_result: 'success',
      };

      await logWebhookAttempt(mockSupabase, entry);

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_logs');
      expect(mockInsert).toHaveBeenCalledWith(entry);
    });

    it('handles supabase errors silently', async () => {
      mockInsert.mockResolvedValue({ error: new Error('Database error') });

      const entry: WebhookLogEntry = {
        webhook_type: 'mobile_money',
        signature_valid: false,
        signature_provided: null,
        source_ip: '10.0.0.1',
        payload: null,
        processing_result: 'signature_invalid',
        error_message: 'Missing signature',
      };

      // Should not throw
      await expect(logWebhookAttempt(mockSupabase, entry)).resolves.toBeUndefined();
    });

    it('handles exceptions without propagation', async () => {
      mockInsert.mockRejectedValue(new Error('Network error'));

      const entry: WebhookLogEntry = {
        webhook_type: 'test',
        signature_valid: false,
        signature_provided: null,
        source_ip: null,
        payload: null,
        processing_result: 'error',
      };

      // Should not throw
      await expect(logWebhookAttempt(mockSupabase, entry)).resolves.toBeUndefined();
    });

    it('logs complete entry with all fields', async () => {
      const entry: WebhookLogEntry = {
        webhook_type: 'intouch',
        signature_valid: true,
        signature_provided: 'sha256=fullsignature123',
        source_ip: '203.0.113.50',
        payload: {
          transaction_id: 'TXN-2024-001',
          amount: 50000,
          currency: 'XOF',
          status: 'completed',
          customer: { phone: '225XXXXXXXXX' },
        },
        processing_result: 'payment_validated',
        error_message: null,
      };

      await logWebhookAttempt(mockSupabase, entry);

      expect(mockInsert).toHaveBeenCalledWith(entry);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  // ============= Integration Tests =============
  describe('Integration: Full webhook verification flow', () => {
    it('verifies a complete webhook flow', async () => {
      const secret = 'production-secret-key';
      const payload = JSON.stringify({
        event: 'payment.completed',
        data: { amount: 10000, transaction_id: 'TXN123' },
      });

      // Generate signature like a webhook provider would
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const signature =
        'sha256=' +
        Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      // Create request with signature
      const req = new Request('https://api.example.com/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: payload,
      });

      // Extract and verify
      const extractedSig = extractSignature(req);
      expect(extractedSig).toBe(signature);

      const isValid = await verifyHmacSignature(payload, extractedSig!, secret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook', async () => {
      const secret = 'production-secret-key';
      const originalPayload = JSON.stringify({ amount: 10000 });
      const tamperedPayload = JSON.stringify({ amount: 99999 });

      // Generate signature for original payload
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(originalPayload)
      );
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Verify with tampered payload should fail
      const isValid = await verifyHmacSignature(tamperedPayload, signature, secret);
      expect(isValid).toBe(false);
    });
  });
});
