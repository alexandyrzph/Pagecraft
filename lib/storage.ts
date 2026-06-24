import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/observability";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pagistry-bucket";
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function saveFile(key: string, body: Buffer, contentType: string): Promise<string> {
  const client = supabase();
  if (client) {
    const { error } = await client.storage.from(BUCKET).upload(key, body, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`storage upload failed: ${error.message}`);
    return client.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }
  const dest = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, body);
  return `/uploads/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  const client = supabase();
  if (client) {
    const { error } = await client.storage.from(BUCKET).remove([key]);
    if (error) logger.warn("storage.delete_failed", { key, message: error.message });
    return;
  }
  await unlink(path.join(LOCAL_DIR, key)).catch(() => {});
}
