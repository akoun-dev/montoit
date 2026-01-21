import { describe, it, expect } from 'vitest';
import { ROLES, OWNER_ROLES, AGENCY_ROLES, PROPERTY_MANAGER_ROLES, type AppRole } from '../roles';

describe('ROLES constants', () => {
  describe('Individual roles', () => {
    it('should have correct TENANT value', () => {
      expect(ROLES.TENANT).toBe('locataire');
    });

    it('should have correct OWNER value', () => {
      expect(ROLES.OWNER).toBe('proprietaire');
    });

    it('should have correct OWNER_EN value', () => {
      expect(ROLES.OWNER_EN).toBe('owner');
    });

    it('should have correct AGENCY value', () => {
      expect(ROLES.AGENCY).toBe('agence');
    });

    it('should have correct AGENT value', () => {
      expect(ROLES.AGENT).toBe('agent');
    });

    it('should have correct ADMIN value', () => {
      expect(ROLES.ADMIN).toBe('admin');
    });

    it('should have correct TRUST_AGENT value', () => {
      expect(ROLES.TRUST_AGENT).toBe('trust_agent');
    });

    it('should have exactly 7 roles defined', () => {
      expect(Object.keys(ROLES)).toHaveLength(7);
    });
  });

  describe('Role groups', () => {
    it('OWNER_ROLES should contain owner variants', () => {
      expect(OWNER_ROLES).toContain('proprietaire');
      expect(OWNER_ROLES).toContain('owner');
      expect(OWNER_ROLES).toHaveLength(2);
    });

    it('AGENCY_ROLES should contain agency variants', () => {
      expect(AGENCY_ROLES).toContain('agence');
      expect(AGENCY_ROLES).toContain('agent');
      expect(AGENCY_ROLES).toHaveLength(2);
    });

    it('PROPERTY_MANAGER_ROLES should combine owners and agencies', () => {
      expect(PROPERTY_MANAGER_ROLES).toContain('proprietaire');
      expect(PROPERTY_MANAGER_ROLES).toContain('owner');
      expect(PROPERTY_MANAGER_ROLES).toContain('agence');
      expect(PROPERTY_MANAGER_ROLES).toContain('agent');
      expect(PROPERTY_MANAGER_ROLES).toHaveLength(4);
    });
  });

  describe('Type safety', () => {
    it('should allow valid AppRole values', () => {
      const validRole: AppRole = 'locataire';
      expect(validRole).toBe(ROLES.TENANT);
    });

    it('ROLES values should match AppRole type', () => {
      const allRoles: AppRole[] = Object.values(ROLES);
      expect(allRoles).toHaveLength(7);
    });
  });
});
