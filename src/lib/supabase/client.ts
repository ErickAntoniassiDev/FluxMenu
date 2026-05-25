const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

function getSupabaseBaseUrl(): string {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return supabaseUrl.replace(/\/$/, '');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function selectFromSupabase<T>(tableName: string, query = 'select=*'): Promise<T[]> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/rest/v1/' + tableName + '?' + query, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + supabaseAnonKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Supabase read failed for ' + tableName + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json() as Promise<T[]>;
}
