import { useState, useMemo } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface UseFAQReturn {
  filteredFAQ: FAQItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  openItems: Set<number>;
  toggleItem: (index: number) => void;
  categories: string[];
}

export function useFAQ(faqData: FAQItem[]): UseFAQReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(faqData.map((item) => item.category)));
    return ['Tous', ...uniqueCategories];
  }, [faqData]);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQ = useMemo(() => {
    return faqData.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [faqData, searchQuery, selectedCategory]);

  return {
    filteredFAQ,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    openItems,
    toggleItem,
    categories,
  };
}
