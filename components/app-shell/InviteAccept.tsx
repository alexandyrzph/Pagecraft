"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/Button";

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<{
    valid: boolean;
    workspaceName?: string;
    role?: string;
    email?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(endpoints.invites.byToken(token))
      .then((r) => setState(r.data))
      .catch(() => setState({ valid: false }));
  }, [token]);

  async function accept() {
    setBusy(true);
    setErr("");
    try {
      await api.post(endpoints.invites.byToken(token));
      router.push("/");
      router.refresh();
    } catch (e) {
      const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
      setErr(d.error || "Could not accept");
      setBusy(false);
    }
  }

  if (!state) return <Loader2 className="animate-spin text-zinc-400" />;
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      {state.valid ? (
        <>
          <h1 className="text-xl font-bold text-zinc-900">Join {state.workspaceName}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            You&apos;ve been invited as <span className="font-medium">{state.role}</span>.
          </p>
          {err && <p className="mt-3 text-sm text-danger-600">{err}</p>}
          <Button variant="neutral" className="mt-5 w-full" onPress={accept} isLoading={busy}>
            Accept invitation
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-zinc-900">Invite unavailable</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            This invitation is invalid, expired, or already used.
          </p>
          <Button variant="link" className="mt-5" onPress={() => router.push("/")}>
            Go to dashboard
          </Button>
        </>
      )}
    </div>
  );
}
