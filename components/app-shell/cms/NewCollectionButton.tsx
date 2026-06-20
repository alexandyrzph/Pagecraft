"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/Button";

export function NewCollectionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const { data: c } = await api.post(endpoints.collections.list, { name: "New collection" });
      if (c?.id) {
        router.push(`/cms/${c.id}`);
        router.refresh();
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }
  return (
    <Button variant="neutral" onPress={create} isLoading={busy} leadingIcon={<Plus size={15} />}>
      New collection
    </Button>
  );
}
