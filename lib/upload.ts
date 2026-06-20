import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export type UploadedAsset = {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
};

type UploadErrorBody = { error?: string };

/** Upload a single file to /api/upload and return its asset record. */
export async function uploadFile(file: File): Promise<UploadedAsset> {
  const fd = new FormData();
  fd.append("file", file);
  try {
    return (await api.post<UploadedAsset>(endpoints.upload, fd)).data;
  } catch (e) {
    if (axios.isAxiosError<UploadErrorBody>(e) && e.response) {
      throw new Error(e.response.data?.error || "Upload failed");
    }
    throw e;
  }
}

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}
