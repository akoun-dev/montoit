/**
 * Tests unitaires pour propertyApi - 10 tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { propertyApi } from '../property.api';
import { supabase } from '@/services/supabase/client';

vi.mock('@/services/supabase/client');

describe('propertyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProperty = {
    id: 'prop-123',
    title: 'Villa Cocody',
    city: 'Abidjan',
    monthly_rent: 300000,
    bedrooms: 3,
    status: 'disponible',
  };

  it('should fetch all properties', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockProperty],
        error: null,
      }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.getAll();
    expect(result.data).toEqual([mockProperty]);
  });

  it('should filter by city', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: [mockProperty], error: null });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: eqMock,
    });
    (supabase.from as any) = mockFrom;

    await propertyApi.getAll({ city: 'Abidjan' });
    expect(eqMock).toHaveBeenCalledWith('city', 'Abidjan');
  });

  it('should fetch by ID', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProperty, error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.getById('prop-123');
    expect(result.data).toEqual(mockProperty);
  });

  it('should fetch by owner', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockProperty], error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.getByOwnerId('owner-123');
    expect(result.data).toEqual([mockProperty]);
  });

  it('should create property', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProperty, error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.create(mockProperty as any);
    expect(result.data).toBeDefined();
  });

  it('should update property', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProperty, error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.update('prop-123', { title: 'Updated' });
    expect(result.data).toBeDefined();
  });

  it('should delete property', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.delete('prop-123');
    expect(result.error).toBeNull();
  });

  it('should search properties', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockProperty], error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.search('Cocody');
    expect(result.data).toEqual([mockProperty]);
  });

  it('should count properties', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 31, error: null }),
    });
    (supabase.from as any) = mockFrom;

    const result = await propertyApi.count();
    expect(result.data).toBe(31);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    });
    (supabase.from as any) = mockFrom;

    await expect(propertyApi.getAll()).rejects.toThrow('Database error');
  });
});
