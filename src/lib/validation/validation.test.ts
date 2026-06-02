import { describe, it, expect } from 'vitest';
import { createProductSchema } from './schemas';

describe('Product validation', () => {
  it('accepts valid product data', () => {
    const result = createProductSchema.safeParse({
      company: 'Acme Corp',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty company', () => {
    const result = createProductSchema.safeParse({
      company: '',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(false);
  });
});