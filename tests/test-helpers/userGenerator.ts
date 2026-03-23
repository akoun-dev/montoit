/**
 * Générateur d'utilisateurs via l'API randomuser.me
 * Adapté pour MonToit - Contexte ivoirien
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Types pour les réponses de l'API
export interface RandomUserAPIResponse {
  results: RandomUser[];
  info: {
    seed: string;
    results: number;
    page: number;
    version: string;
  };
}

export interface RandomUser {
  gender: 'male' | 'female';
  name: {
    title: string;
    first: string;
    last: string;
  };
  location: {
    street: { number: number; name: string };
    city: string;
    state: string;
    country: string;
    postcode: string | number;
    coordinates: { latitude: string; longitude: string };
    timezone: { offset: string; description: string };
  };
  email: string;
  login: {
    uuid: string;
    username: string;
    password: string;
    salt: string;
    md5: string;
    sha1: string;
    sha256: string;
  };
  dob: { date: string; age: number };
  registered: { date: string; age: number };
  phone: string;
  cell: string;
  id: { name: string | null; value: string | null };
  picture: {
    large: string;
    medium: string;
    thumbnail: string;
  };
  nat: string;
}

// Interface pour votre profil applicatif MonToit
export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string;
  location: {
    city: string;
    country: string;
    address?: string;
  };
  dateOfBirth: Date;
  gender: 'male' | 'female';
  metadata: {
    source: 'randomuser.me';
    generatedAt: string;
    originalNat: string;
  };
}

// Configuration du générateur
export interface UserGeneratorOptions {
  count?: number;              // Nombre d'utilisateurs (1-500)
  nationality?: string;        // Code pays (ex: 'ci' pour Côte d'Ivoire)
  gender?: 'male' | 'female';  // Filtrer par genre
  includeFields?: string[];    // Champs à inclure (par défaut: tous)
  seed?: string;               // Seed pour résultats reproductibles
  forceIvorianPhone?: boolean; // Générer un numéro ivoirien valide
}

export class RandomUserGenerator {
  private readonly BASE_URL = 'https://randomuser.me/api';

  /**
   * Génère un ou plusieurs utilisateurs depuis l'API
   */
  async generateUsers(options: UserGeneratorOptions = {}): Promise<UserProfile[]> {
    const {
      count = 1,
      nationality,
      gender,
      seed,
      forceIvorianPhone = true
    } = options;

    // Construction des query params
    const params = new URLSearchParams({
      results: count.toString(),
      format: 'json'
    });

    if (nationality) params.append('nat', nationality);
    if (gender) params.append('gender', gender);
    if (seed) params.append('seed', seed);
    if (options.includeFields?.length) {
      params.append('inc', options.includeFields.join(','));
    }

    const url = `${this.BASE_URL}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // Timeout de 10 secondes
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data: RandomUserAPIResponse = await response.json();
      
      return data.results.map(user => 
        this.transformToUserProfile(user, { forceIvorianPhone })
      );
    } catch (error) {
      console.error('❌ Erreur lors de la génération des utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Transforme un utilisateur RandomUser en UserProfile MonToit
   */
  private transformToUserProfile(
    user: RandomUser, 
    options: { forceIvorianPhone: boolean }
  ): UserProfile {
    
    // Génération d'un numéro ivoirien si demandé
    const phone = options.forceIvorianPhone || user.nat === 'CI' || user.nat === 'ci'
      ? this.generateIvorianPhone(user.gender)
      : user.cell || user.phone;

    return {
      id: user.login.uuid,
      email: user.email.toLowerCase(),
      phone,
      firstName: user.name.first,
      lastName: user.name.last,
      fullName: `${user.name.first} ${user.name.last}`,
      avatar: user.picture.medium,
      location: {
        city: user.location.city,
        country: user.location.country,
        address: `${user.location.street.name} ${user.location.street.number}`
      },
      dateOfBirth: new Date(user.dob.date),
      gender: user.gender,
      metadata: {
        source: 'randomuser.me',
        generatedAt: new Date().toISOString(),
        originalNat: user.nat
      }
    };
  }

  /**
   * Génère un numéro de téléphone ivoirien valide
   * Formats: 07XX XX XX, 05XX XX XX, 01XX XX XX, etc.
   */
  private generateIvorianPhone(gender?: 'male' | 'female'): string {
    // Préfixes opérateurs ivoiriens
    const prefixes = ['07', '05', '01', '40', '41', '42', '43', '44', '45'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // Générer 6 chiffres aléatoires
    const remaining = Array.from({ length: 6 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
    
    // Format: 07 12 34 56
    return `${prefix} ${remaining.slice(0,2)} ${remaining.slice(2,4)} ${remaining.slice(4)}`;
  }

  /**
   * Génère un utilisateur unique (alias pratique)
   */
  async generateOne(options: Omit<UserGeneratorOptions, 'count'> = {}): Promise<UserProfile> {
    const users = await this.generateUsers({ ...options, count: 1 });
    return users[0];
  }

  /**
   * Génère des utilisateurs avec seed reproductible (utile pour les tests)
   */
  async generateWithSeed(seed: string, count = 1): Promise<UserProfile[]> {
    return this.generateUsers({ seed, count, forceIvorianPhone: true });
  }
}