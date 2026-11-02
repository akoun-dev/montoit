// Données d'exemple pour le Dashboard d'Agence
// À utiliser pour les tests et la démonstration

export const mockAgencyData = {
  id: 'agency-123',
  name: 'MonToit Premium',
  verification_status: 'verified',
  commission_rate: 5.0,
  logo: '/images/agency-logo.png',
  address: "123 Avenue de l'Immobilier, Abidjan",
  phone: '+225 27 20 123 456',
  email: 'contact@montoit-premium.ci',
  website: 'https://montoit-premium.ci',
  description: "Agence immobilière premium spécialisée dans le luxe et l'immobilier commercial",
  established_date: '2020-01-15',
};

export const mockStats = {
  portfolioProperties: 47,
  activeAgents: 12,
  totalCommissions: 2450000,
  conversionRate: 18.5,
  monthlyCommissions: 320000,
  pendingRegistrations: 3,
  conversionsThisMonth: 8,
  avgDealValue: 1850000,
};

export const mockTeamMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    role: 'admin',
    status: 'active',
    commission_rate: 0,
    created_at: '2024-01-15T10:00:00Z',
    profiles: {
      full_name: 'Marie Dubois',
      email: 'marie.dubois@montoit-premium.ci',
      phone: '+225 07 12 34 56',
      avatar_url: '/images/avatars/marie.jpg',
    },
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    role: 'manager',
    status: 'active',
    commission_rate: 8.0,
    created_at: '2024-02-01T09:00:00Z',
    profiles: {
      full_name: 'Jean-Claude Kouassi',
      email: 'jc.kouassi@montoit-premium.ci',
      phone: '+225 05 98 76 54',
      avatar_url: '/images/avatars/jean-claude.jpg',
    },
  },
  {
    id: 'member-3',
    user_id: 'user-3',
    role: 'agent',
    status: 'active',
    commission_rate: 5.5,
    created_at: '2024-03-10T14:30:00Z',
    profiles: {
      full_name: 'Aminata Traoré',
      email: 'aminata.traore@montoit-premium.ci',
      phone: '+225 01 23 45 67',
      avatar_url: '/images/avatars/aminata.jpg',
    },
  },
  {
    id: 'member-4',
    user_id: 'user-4',
    role: 'agent',
    status: 'active',
    commission_rate: 6.0,
    created_at: '2024-04-05T11:15:00Z',
    profiles: {
      full_name: 'Kouadio Jean-Baptiste',
      email: 'kouadio.jb@montoit-premium.ci',
      phone: '+225 07 89 01 23',
      avatar_url: '/images/avatars/kouadio.jpg',
    },
  },
];

export const mockPropertyAssignments = [
  {
    id: 'assignment-1',
    property_id: 'prop-1',
    agent_id: 'user-3',
    assigned_at: '2024-11-01T09:00:00Z',
    status: 'active',
    properties: {
      title: 'Villa Moderne Riviera',
      price: 850000000,
      status: 'active',
      type: 'villa',
      address: 'Riviera Golf, Abidjan',
      bedrooms: 5,
      bathrooms: 4,
      area: 450,
    },
    profiles: {
      full_name: 'Aminata Traoré',
    },
  },
  {
    id: 'assignment-2',
    property_id: 'prop-2',
    agent_id: 'user-4',
    assigned_at: '2024-11-05T14:30:00Z',
    status: 'active',
    properties: {
      title: 'Appartement T3 Centre-Ville',
      price: 180000000,
      status: 'active',
      type: 'apartment',
      address: 'Plateau, Abidjan',
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
    },
    profiles: {
      full_name: 'Kouadio Jean-Baptiste',
    },
  },
  {
    id: 'assignment-3',
    property_id: 'prop-3',
    agent_id: 'user-3',
    assigned_at: '2024-11-10T10:15:00Z',
    status: 'sold',
    properties: {
      title: 'Bureau Moderne Cocody',
      price: 320000000,
      status: 'sold',
      type: 'office',
      address: 'Cocody Centre, Abidjan',
      bedrooms: 0,
      bathrooms: 2,
      area: 200,
    },
    profiles: {
      full_name: 'Aminata Traoré',
    },
  },
];

export const mockCommissions = [
  {
    id: 'commission-1',
    amount: 25500000,
    status: 'paid',
    created_at: '2024-11-15T16:30:00Z',
    paid_at: '2024-11-20T10:00:00Z',
    agent_id: 'user-3',
    transaction_type: 'sale',
    profiles: {
      full_name: 'Aminata Traoré',
    },
  },
  {
    id: 'commission-2',
    amount: 12000000,
    status: 'pending',
    created_at: '2024-11-25T14:20:00Z',
    agent_id: 'user-4',
    transaction_type: 'sale',
    profiles: {
      full_name: 'Kouadio Jean-Baptiste',
    },
  },
  {
    id: 'commission-3',
    amount: 8500000,
    status: 'paid',
    created_at: '2024-11-28T09:45:00Z',
    paid_at: '2024-11-30T11:30:00Z',
    agent_id: 'user-3',
    transaction_type: 'rental',
    profiles: {
      full_name: 'Aminata Traoré',
    },
  },
];

export const mockRegistrationRequests = [
  {
    id: 'registration-1',
    agent_name: 'Fatou Koné',
    agent_email: 'fatou.kone@email.com',
    agent_phone: '+225 07 55 44 33',
    requested_role: 'agent',
    status: 'pending',
    submitted_at: '2024-11-28T10:30:00Z',
    experience_years: 4,
    certifications: ['Certification FNAIM', 'Négociation immobilière'],
    previous_agency: 'Immobilier Plus',
    education_level: 'Master en Gestion Immobilière',
    specializations: ['Villas de luxe', 'Immobilier commercial'],
    motivation:
      'Je souhaite rejoindre une agence premium pour développer mes compétences dans le secteur haut de gamme.',
    portfolio_properties: 25,
    expected_salary: 2500000,
    availability: 'Immédiat',
    languages: ['Français', 'Dioula', 'Baoulé'],
  },
  {
    id: 'registration-2',
    agent_name: 'Mamadou Bah',
    agent_email: 'mamadou.bah@email.com',
    agent_phone: '+225 05 33 22 11',
    requested_role: 'agent',
    status: 'pending',
    submitted_at: '2024-11-30T15:45:00Z',
    experience_years: 2,
    certifications: ['Formation initiale immobilier'],
    previous_agency: 'Premier Contact',
    education_level: 'Licence en Économie',
    specializations: ['Appartements', 'Maisons familiales'],
    motivation:
      "Passionné par l'immobilier, je cherche une équipe dynamique pour progresser ensemble.",
    portfolio_properties: 12,
    expected_salary: 1800000,
    availability: 'Dans 2 semaines',
    languages: ['Français', 'Malinké', 'Soussou'],
  },
  {
    id: 'registration-3',
    agent_name: 'Aya Ouattara',
    agent_email: 'aya.ouattara@email.com',
    agent_phone: '+225 07 99 88 77',
    requested_role: 'manager',
    status: 'pending',
    submitted_at: '2024-11-29T13:20:00Z',
    experience_years: 8,
    certifications: ['MBA Immobilier', 'Certification Management', 'Expert en évaluation'],
    previous_agency: 'Abidjan Properties',
    education_level: 'MBA en Immobilier et Finance',
    specializations: ['Immobilier de bureaux', "Gestion d'équipe", 'Stratégie commerciale'],
    motivation:
      "Fort de mon expérience en management, je souhaite prendre la direction d'une équipe performante.",
    portfolio_properties: 150,
    expected_salary: 4000000,
    availability: 'Dans 1 mois',
    languages: ['Français', 'Anglais', 'Baoulé'],
  },
];

export const mockPerformanceData = [
  { label: 'Juin', value: 45 },
  { label: 'Juillet', value: 52 },
  { label: 'Août', value: 38 },
  { label: 'Septembre', value: 61 },
  { label: 'Octobre', value: 48 },
  { label: 'Novembre', value: 67 },
];

export const mockNotifications = [
  {
    id: 'notification-1',
    type: 'registration_request',
    title: "Nouvelle demande d'inscription",
    message: "Fatou Koné a soumis une demande d'inscription en tant qu'agent",
    created_at: '2024-11-28T10:30:00Z',
    read_at: null,
  },
  {
    id: 'notification-2',
    type: 'commission_paid',
    title: 'Commission versée',
    message: 'Une commission de 8,5M FCFA a été versée à Aminata Traoré',
    created_at: '2024-11-30T11:30:00Z',
    read_at: null,
  },
  {
    id: 'notification-3',
    type: 'property_assigned',
    title: 'Nouvelle attribution',
    message: 'Appartement T3 Centre-Ville attribué à Kouadio Jean-Baptiste',
    created_at: '2024-11-05T14:30:00Z',
    read_at: '2024-11-05T14:35:00Z',
  },
];

// Fonction utilitaire pour simuler des données en temps réel
export const generateRealtimeStats = () => ({
  ...mockStats,
  portfolioProperties: mockStats.portfolioProperties + Math.floor(Math.random() * 3),
  monthlyCommissions: mockStats.monthlyCommissions + Math.floor(Math.random() * 50000),
  conversionRate: Math.min(25, mockStats.conversionRate + (Math.random() - 0.5) * 2),
  lastUpdated: new Date().toISOString(),
});

// Configuration des couleurs pour les graphiques
export const chartColors = {
  primary: '#FF6C2F',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  neutral: '#6B7280',
};

// Types TypeScript pour les données
export interface MockAgencyData {
  id: string;
  name: string;
  verification_status: string;
  commission_rate: number;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  established_date?: string;
}

export interface MockStats {
  portfolioProperties: number;
  activeAgents: number;
  totalCommissions: number;
  conversionRate: number;
  monthlyCommissions: number;
  pendingRegistrations: number;
  conversionsThisMonth: number;
  avgDealValue: number;
}

export interface MockTeamMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  commission_rate: number;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
  };
}

export interface MockPropertyAssignment {
  id: string;
  property_id: string;
  agent_id: string;
  assigned_at: string;
  status: string;
  properties: {
    title: string;
    price: number;
    status: string;
    type: string;
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
  };
  profiles: {
    full_name: string;
  };
}

export interface MockCommission {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  agent_id: string;
  transaction_type: string;
  profiles: {
    full_name: string;
  };
}

export interface MockRegistrationRequest {
  id: string;
  agent_name: string;
  agent_email: string;
  agent_phone: string;
  requested_role: string;
  status: string;
  submitted_at: string;
  experience_years?: number;
  certifications?: string[];
  previous_agency?: string;
  education_level?: string;
  specializations?: string[];
  motivation?: string;
  portfolio_properties?: number;
  expected_salary?: number;
  availability?: string;
  languages?: string[];
}

export interface MockNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read_at?: string | null;
}
