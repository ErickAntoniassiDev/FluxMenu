import { RestaurantId } from '../types';
import {
  deleteSupabaseStorageObjects,
  getSupabasePublicStoragePath,
  uploadSupabaseStorageObject
} from '../lib/supabase/client';

const PRODUCT_IMAGE_BUCKET = 'product-images';
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 1200;
const MAX_UPLOAD_BYTES = 800 * 1024;
const WEBP_QUALITIES = [0.82, 0.72, 0.62, 0.52];

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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error('Seu navegador não conseguiu converter a imagem para WEBP.'));
      else resolve(blob);
    }, 'image/webp', quality);
  });
}

async function compressProductImage(file: File): Promise<Blob> {
  assertImageFile(file);
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem para upload.');

  context.drawImage(image, 0, 0, width, height);

  let bestBlob: Blob | null = null;
  for (const quality of WEBP_QUALITIES) {
    const blob = await canvasToBlob(canvas, quality);
    bestBlob = blob;
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }

  if (bestBlob && bestBlob.size <= 900 * 1024) return bestBlob;
  throw new Error('Imagem muito pesada. Use uma foto menor ou mais comprimida.');
}

function productImagePath(restaurantId: RestaurantId, productId: string): string {
  return restaurantId + '/' + productId + '/' + Date.now() + '.webp';
}

function ownProductStoragePath(restaurantId: RestaurantId, productId: string, publicUrl?: string): string | null {
  if (!publicUrl) return null;
  const path = getSupabasePublicStoragePath(PRODUCT_IMAGE_BUCKET, publicUrl);
  if (!path) return null;
  const expectedPrefix = restaurantId + '/' + productId + '/';
  return path.startsWith(expectedPrefix) ? path : null;
}

export async function uploadProductImage(restaurantId: RestaurantId, productId: string, file: File): Promise<string> {
  if (!restaurantId) throw new Error('Restaurante obrigatório para enviar imagem.');
  if (!productId) throw new Error('Produto obrigatório para enviar imagem.');

  const blob = await compressProductImage(file);
  return uploadSupabaseStorageObject(PRODUCT_IMAGE_BUCKET, productImagePath(restaurantId, productId), blob, 'image/webp');
}

export async function deleteProductImageUrl(restaurantId: RestaurantId, productId: string, publicUrl?: string): Promise<void> {
  const path = ownProductStoragePath(restaurantId, productId, publicUrl);
  if (!path) return;
  await deleteSupabaseStorageObjects(PRODUCT_IMAGE_BUCKET, [path]);
}
