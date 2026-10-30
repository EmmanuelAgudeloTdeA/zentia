import { describe, expect, it } from 'vitest';
import { SignatureImageInspector } from './signature-image-inspector.js';

const inspector = new SignatureImageInspector();

describe('SignatureImageInspector', () => {
  it('detects PNG and JPEG by their leading bytes', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(inspector.detect(png)).toBe('image/png');
    expect(inspector.detect(jpeg)).toBe('image/jpeg');
  });

  it('returns null for other formats and short buffers', () => {
    expect(inspector.detect(Buffer.from('GIF89a'))).toBeNull();
    expect(inspector.detect(Buffer.from('<svg></svg>'))).toBeNull();
    expect(inspector.detect(Uint8Array.from([0xff, 0xd8]))).toBeNull();
  });
});
