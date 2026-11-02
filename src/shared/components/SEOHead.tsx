import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
}

export default function SEOHead({
  title = "Mon Toit - Plateforme de Location Immobilière en Côte d'Ivoire",
  description = "Trouvez votre logement idéal en Côte d'Ivoire. Plateforme sécurisée et certifiée ANSUT avec paiement Mobile Money intégré. Plus de 1000 propriétés à Abidjan, Yamoussoukro, Bouaké.",
  keywords = "location, immobilier, Côte d'Ivoire, Abidjan, ANSUT, logement, appartement, maison, studio, villa, cocody, marcory, plateau, yopougon",
  image = 'https://montoit.ci/logo.png',
  url = 'https://montoit.ci',
  type = 'website',
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph meta tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'Mon Toit', true);
    updateMetaTag('og:locale', 'fr_CI', true);

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Structured data
    if (structuredData) {
      let scriptElement = document.querySelector('script[type="application/ld+json"]');

      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptElement);
      }

      scriptElement.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, image, url, type, structuredData]);

  return null;
}

// Helper function to create structured data for a property
export function createPropertyStructuredData(property: {
  id: string;
  title: string;
  description: string;
  monthly_rent: number;
  city: string;
  neighborhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  surface_area: number;
  images?: string[];
  main_image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: property.title,
    description: property.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.city,
      addressRegion: property.neighborhood,
      streetAddress: property.address,
      addressCountry: 'CI',
    },
    numberOfRooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: property.surface_area,
      unitCode: 'MTK',
    },
    image: property.images || [property.main_image],
    offers: {
      '@type': 'Offer',
      price: property.monthly_rent,
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  };
}

// Helper function to create structured data for the organization
export function createOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Mon Toit',
    alternateName: 'Mon Toit CI',
    url: 'https://montoit.ci',
    logo: 'https://montoit.ci/logo.png',
    description:
      "Plateforme immobilière pour un accès universel au logement en Côte d'Ivoire. Signature électronique certifiée ANSUT.",
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Abidjan',
      addressCountry: 'CI',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@mon-toit.ci',
      contactType: 'customer service',
      availableLanguage: ['French'],
    },
    sameAs: [
      'https://facebook.com/montoit',
      'https://twitter.com/montoit',
      'https://instagram.com/montoit',
    ],
  };
}

// Helper function to create structured data for the website
export function createWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mon Toit',
    url: 'https://montoit.ci',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://montoit.ci/recherche?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

// Helper function to create breadcrumb structured data
export function createBreadcrumbStructuredData(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
