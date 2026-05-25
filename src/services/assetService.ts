import { uploadSupabaseAsset } from '../lib/supabase/client';
import { RestaurantId } from '../types';

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadRestaurantAsset(restaurantId: RestaurantId, kind: 'logo' | 'banner', file: File): Promise<string> {
  if (!restaurantId) throw new Error('restaurant_id obrigatório.');
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem.');
  const path = restaurantId + '/' + kind + '-' + Date.now() + '.' + extensionFor(file);
  return uploadSupabaseAsset('restaurant-assets', path, file);
}
