import { uploadSupabaseStorageObject } from '../lib/supabase/client';
import { RestaurantId } from '../types';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ASSET_DIMENSION = 1600;
const MAX_ASSET_BYTES = 900 * 1024;
const ASSET_QUALITIES = [0.84, 0.74, 0.64, 0.54];

function assertImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Envie uma imagem JPG, PNG ou WEBP.');
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    image.src = url;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error('Seu navegador não conseguiu converter a imagem para WEBP.'));
      else resolve(blob);
    }, 'image/webp', quality);
  });
}

async function compressAssetImage(file: File, kind: 'logo' | 'banner'): Promise<Blob> {
  assertImageFile(file);
  const image = await loadImage(file);
  const maxDimension = kind === 'logo' ? 800 : MAX_ASSET_DIMENSION;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem para upload.');
  context.drawImage(image, 0, 0, width, height);

  let bestBlob: Blob | null = null;
  for (const quality of ASSET_QUALITIES) {
    const blob = await canvasToWebp(canvas, quality);
    bestBlob = blob;
    if (blob.size <= MAX_ASSET_BYTES) return blob;
  }

  if (bestBlob && bestBlob.size <= 1200 * 1024) return bestBlob;
  throw new Error('Imagem muito pesada. Use uma foto menor ou mais comprimida.');
}

export async function uploadRestaurantAsset(restaurantId: RestaurantId, kind: 'logo' | 'banner', file: File): Promise<string> {
  if (!restaurantId) throw new Error('restaurant_id obrigatório.');
  const blob = await compressAssetImage(file, kind);
  const path = restaurantId + '/' + kind + '.webp';
  return uploadSupabaseStorageObject('restaurant-assets', path, blob, 'image/webp');
}
