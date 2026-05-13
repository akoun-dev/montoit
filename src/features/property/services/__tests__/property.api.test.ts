import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  fromMock,
  cacheServiceMock,
  permissionGuard,
  ownershipGuard,
  requirePermissionMock,
  requireOwnershipMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  cacheServiceMock: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    invalidatePattern: vi.fn(),
  },
  permissionGuard: vi.fn().mockResolvedValue(undefined),
  ownershipGuard: vi.fn().mockResolvedValue(undefined),
  requirePermissionMock: vi.fn(),
  requireOwnershipMock: vi.fn(),
}));

requirePermissionMock.mockImplementation(() => permissionGuard);
requireOwnershipMock.mockImplementation(() => ownershipGuard);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/shared/services/cacheService', () => ({
  cacheService: cacheServiceMock,
}));

vi.mock('@/shared/services/roleValidation.service', () => ({
  requirePermission: requirePermissionMock,
  requireOwnership: requireOwnershipMock,
}));

import { propertyApi } from '../property.api';

function createBuilder(queryResult: unknown, singleResult = queryResult) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue(singleResult),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(queryResult).then(resolve),
  };

  return builder;
}

describe('propertyApi', () => {
  const mockProperty = {
    id: 'prop-123',
    owner_id: null,
    title: 'Villa Cocody',
    city: 'Abidjan',
    monthly_rent: 300000,
    bedrooms: 3,
    bathrooms: 2,
    surface_area: 180,
    status: 'available',
    created_at: '2025-01-01T00:00:00.000Z',
    price: 300000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cacheServiceMock.get.mockReturnValue(null);
  });

  it('should fetch all properties', async () => {
    fromMock.mockImplementation((table: string) => {
      expect(table).toBe('properties');
      return createBuilder({ data: [mockProperty], error: null });
    });

    const result = await propertyApi.getAll();

    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'prop-123',
        title: 'Villa Cocody',
        owner_full_name: null,
        owner_avatar_url: null,
        owner_is_verified: null,
        owner_trust_score: null,
      }),
    ]);
  });

  it('should filter by city', async () => {
    const builder = createBuilder({ data: [mockProperty], error: null });
    fromMock.mockReturnValue(builder);

    await propertyApi.getAll({ city: 'Abidjan' });

    expect(builder.eq).toHaveBeenCalledWith('city', 'Abidjan');
  });

  it('should fetch by ID', async () => {
    const builder = createBuilder(
      { data: mockProperty, error: null },
      { data: mockProperty, error: null }
    );
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.getById('prop-123');

    expect(result.data).toEqual(
      expect.objectContaining({
        id: 'prop-123',
        bedrooms_count: 3,
        bathrooms_count: 2,
        monthly_rent: 300000,
        price: 300000,
      })
    );
  });

  it('should fetch by owner', async () => {
    const builder = createBuilder({ data: [mockProperty], error: null });
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.getByOwnerId('owner-123');

    expect(builder.eq).toHaveBeenCalledWith('owner_id', 'owner-123');
    expect(result.data).toHaveLength(1);
  });

  it('should create property', async () => {
    const builder = createBuilder(
      { data: mockProperty, error: null },
      { data: mockProperty, error: null }
    );
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.create(mockProperty as never);

    expect(requirePermissionMock).toHaveBeenCalledWith('canCreateProperty');
    expect(permissionGuard).toHaveBeenCalled();
    expect(result.data).toEqual(mockProperty);
    expect(cacheServiceMock.invalidatePattern).toHaveBeenCalled();
  });

  it('should update property', async () => {
    const builder = createBuilder(
      { data: mockProperty, error: null },
      { data: mockProperty, error: null }
    );
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.update('prop-123', { title: 'Updated' });

    expect(requirePermissionMock).toHaveBeenCalledWith('canEditProperty');
    expect(requireOwnershipMock).toHaveBeenCalledWith('property');
    expect(ownershipGuard).toHaveBeenCalledWith('prop-123');
    expect(result.data).toEqual(mockProperty);
  });

  it('should delete property', async () => {
    const builder = createBuilder({ error: null });
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.delete('prop-123');

    expect(requirePermissionMock).toHaveBeenCalledWith('canDeleteProperty');
    expect(requireOwnershipMock).toHaveBeenCalledWith('property');
    expect(result.error).toBeNull();
  });

  it('should search properties', async () => {
    const builder = createBuilder({ data: [mockProperty], error: null });
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.search('Cocody');

    expect(builder.or).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('status', 'available');
    expect(result.data).toHaveLength(1);
  });

  it('should count properties', async () => {
    const builder = createBuilder({ count: 31, error: null });
    fromMock.mockReturnValue(builder);

    const result = await propertyApi.count();

    expect(result.data).toBe(31);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');
    const builder = createBuilder({ data: null, error: mockError });
    fromMock.mockReturnValue(builder);

    await expect(propertyApi.getAll()).rejects.toThrow('Database error');
  });
});
