import { Category } from '../types';

export const CATEGORY_IMAGE_PRESETS: Record<Category, string> = {
  'Copos & Taças': 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=500&auto=format&fit=crop&q=80',
  'Pratos & Potes': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop&q=80',
  'Marmitex & Alumínio': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
  'Talheres & Canudos': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
  'Guardanapos & Papéis': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
  'Sacolas & Bobinas': 'https://images.unsplash.com/photo-1597348989645-46b190ce4918?w=500&auto=format&fit=crop&q=80',
  'Filmes & Embalagens': 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=80',
  'Higiene & Proteção': 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=500&auto=format&fit=crop&q=80',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  'Copos & Taças': '🥤',
  'Pratos & Potes': '🍽️',
  'Marmitex & Alumínio': '🍱',
  'Talheres & Canudos': '🍴',
  'Guardanapos & Papéis': '🧻',
  'Sacolas & Bobinas': '🛍️',
  'Filmes & Embalagens': '📦',
  'Higiene & Proteção': '🧤',
};

export function getProductImage(category: Category, customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 5) {
    return customUrl;
  }
  return CATEGORY_IMAGE_PRESETS[category] || CATEGORY_IMAGE_PRESETS['Copos & Taças'];
}
