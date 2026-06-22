import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export function loadAiAvailability(setHasAi: (v: boolean) => void): void {
  api
    .get(endpoints.ai)
    .then((r) => r.data)
    .then((d) => setHasAi(Array.isArray(d.providers) && d.providers.length > 0))
    .catch(() => {});
}
