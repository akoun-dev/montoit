import { useEffect } from 'react';

interface DocumentHeadOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  structuredData?: object[];
}

/**
 * Hook to manage document head (title, meta tags, structured data)
 * Simple alternative to react-helmet that works without additional dependencies
 */
export const useDocumentHead = (options: DocumentHeadOptions) => {
  useEffect(() => {
    const originalTitle = document.title;
    const addedElements: HTMLElement[] = [];

    // Set title
    if (options.title) {
      document.title = options.title;
    }

    // Helper to create or update meta tag
    const setMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
        addedElements.push(element);
      }

      element.content = content;
    };

    // Set meta description
    if (options.description) {
      setMetaTag('description', options.description);
    }

    // Set Open Graph tags
    if (options.ogTitle) {
      setMetaTag('og:title', options.ogTitle, true);
    }
    if (options.ogDescription) {
      setMetaTag('og:description', options.ogDescription, true);
    }
    if (options.ogImage) {
      setMetaTag('og:image', options.ogImage, true);
    }
    if (options.ogUrl) {
      setMetaTag('og:url', options.ogUrl, true);
    }

    // Set Twitter Card tags
    if (options.twitterCard) {
      setMetaTag('twitter:card', options.twitterCard);
    }
    if (options.ogTitle) {
      setMetaTag('twitter:title', options.ogTitle);
    }
    if (options.ogDescription) {
      setMetaTag('twitter:description', options.ogDescription);
    }
    if (options.ogImage) {
      setMetaTag('twitter:image', options.ogImage);
    }

    // Add structured data (JSON-LD)
    if (options.structuredData) {
      options.structuredData.forEach((data) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
        addedElements.push(script);
      });
    }

    // Cleanup on unmount
    return () => {
      document.title = originalTitle;
      addedElements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, [
    options.title,
    options.description,
    options.ogTitle,
    options.ogDescription,
    options.ogImage,
    options.ogUrl,
    options.twitterCard,
    JSON.stringify(options.structuredData),
  ]);
};
