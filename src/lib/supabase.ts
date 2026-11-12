import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
);

export const STORAGE_BUCKET = 'internflow-documents';
export const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
];

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}

/**
 * Converts low-level Supabase/PostgreSQL errors into safe, user-friendly messages.
 * Never exposes raw SQL details to end users.
 */
export function formatAppError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Invalid email or password.';
    if (msg.includes('row-level security') || msg.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return 'A matching record already exists. Duplicate submission prevented.';
    }
    if (msg.includes('foreign key')) {
      return 'The referenced record could not be found or is no longer active.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error while reaching the server. Please check your connection and retry.';
    }
    return err.message || fallback;
  }
  return fallback;
}

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `File "${file.name}" exceeds the 15 MB size limit.`;
  }
  if (file.type && !ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type}" is not permitted for upload.`;
  }
  return null;
}

export async function uploadPrivateFile(
  folder: string,
  file: File
): Promise<{ path: string; name: string; size: number; mime_type: string }> {
  const validationError = validateUploadFile(file);
  if (validationError) throw new Error(validationError);

  const client = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  const { error } = await client.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) {
    throw new Error(formatAppError(error, 'Failed to upload file securely.'));
  }

  return {
    path: storagePath,
    name: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
  };
}

export async function getSignedFileUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(formatAppError(error, 'Unable to generate secure download link.'));
  }
  return data.signedUrl;
}

