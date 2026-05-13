import { describe, it, expect } from 'vitest';
import { ROLES, OWNER_ROLES, AGENCY_ROLES, PROPERTY_MANAGER_ROLES, type AppRole } from '../roles';

describe('ROLES constants', () => {
  describe('Individual roles', () => {
    it('should have correct TENANT value', () => {
      expect(ROLES.TENANT).toBe('tenant');
    });

    it('should have correct OWNER value', () => {
      expect(ROLES.OWNER).toBe('owner');
    });

    it('should have correct AGENCY value', () => {
      expect(ROLES.AGENCY).toBe('agency');
    });

    it('should have correct ADMIN value', () => {
      expect(ROLES.ADMIN).toBe('admin');
    });

    it('should have correct TRUST_AGENT value', () => {
      expect(ROLES.TRUST_AGENT).toBe('trust_agent');
    });

    it('should have exactly 5 roles defined', () => {
      expect(Object.keys(ROLES)).toHaveLength(5);
    });
  });

  describe('Role groups', () => {
    it('OWNER_ROLES should contain owner', () => {
      expect(OWNER_ROLES).toContain('owner');
      expect(OWNER_ROLES).toHaveLength(1);
    });

    it('AGENCY_ROLES should contain agency', () => {
      expect(AGENCY_ROLES).toContain('agency');
      expect(AGENCY_ROLES).toHaveLength(1);
    });

    it('PROPERTY_MANAGER_ROLES should combine owners and agencies', () => {
      expect(PROPERTY_MANAGER_ROLES).toContain('owner');
      expect(PROPERTY_MANAGER_ROLES).toContain('agency');
      expect(PROPERTY_MANAGER_ROLES).toHaveLength(2);
    });
  });

  describe('Type safety', () => {
    it('should allow valid AppRole values', () => {
      const validRole: AppRole = 'tenant';
      expect(validRole).toBe(ROLES.TENANT);
    });

    it('ROLES values should match AppRole type', () => {
      const allRoles: AppRole[] = Object.values(ROLES);
      expect(allRoles).toHaveLength(5);
    });
  });
});
