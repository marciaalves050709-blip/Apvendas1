import { Category } from '../types';

export const CATEGORY_IMAGE_PRESETS: Record<string, string> = {
  // Principais segmentos / atividades solicitados pelo usuário
  'Salão de Beleza': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80',
  'Padaria': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  'Pizzaria': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
  'Restaurante': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
  'Hambúrguer': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
  'Mercadinho': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80',
  'Maquiagem': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80',
  'Descartáveis': 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=500&auto=format&fit=crop&q=80',
  'Distribuidora': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=80',
  // Categorias de embalagens e suporte
  'Copos & Taças': 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=500&auto=format&fit=crop&q=80',
  'Pratos & Potes': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop&q=80',
  'Marmitex & Alumínio': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
  'Talheres & Canudos': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
  'Guardanapos & Papéis': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
  'Sacolas & Bobinas': 'https://images.unsplash.com/photo-1597348989645-46b190ce4918?w=500&auto=format&fit=crop&q=80',
  'Filmes & Embalagens': 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=80',
  'Higiene & Proteção': 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=500&auto=format&fit=crop&q=80',
  'Outros': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=500&auto=format&fit=crop&q=80',
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Salão de Beleza': '💅',
  'Padaria': '🥖',
  'Pizzaria': '🍕',
  'Restaurante': '🍽️',
  'Hambúrguer': '🍔',
  'Mercadinho': '🏪',
  'Maquiagem': '💄',
  'Descartáveis': '📦',
  'Distribuidora': '🚚',
  'Copos & Taças': '🥤',
  'Pratos & Potes': '🍽️',
  'Marmitex & Alumínio': '🍱',
  'Talheres & Canudos': '🍴',
  'Guardanapos & Papéis': '🧻',
  'Sacolas & Bobinas': '🛍️',
  'Filmes & Embalagens': '📦',
  'Higiene & Proteção': '🧤',
  'Outros': '✨',
};

export const ALL_ACTIVITY_CATEGORIES = [
  'Salão de Beleza',
  'Padaria',
  'Pizzaria',
  'Restaurante',
  'Hambúrguer',
  'Mercadinho',
  'Maquiagem',
  'Descartáveis',
  'Distribuidora',
  'Outros',
] as const;

export function getProductImage(category: Category, customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 5) {
    return customUrl;
  }
  return CATEGORY_IMAGE_PRESETS[category] || CATEGORY_IMAGE_PRESETS['Mercadinho'] || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80';
}

/**
 * Carrega a foto selecionada da galeria ou câmera do celular/computador,
 * redimensiona para no máximo 800x800 e comprime em Base64 para armazenamento
 * leve e instantâneo (funciona 100% offline).
 */
export function processGalleryImage(file: File, maxDimension = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da galeria.'));
    reader.readAsDataURL(file);
  });
}
