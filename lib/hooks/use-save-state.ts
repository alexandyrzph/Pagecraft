"use client";
import { useState } from "react";
import axios from "axios";

export function useSaveState() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function run(action: () => Promise<void>, onSuccess?: () => void) {
    setBusy(true);
    setOk(false);
    setErr("");
    try {
      await action();
      setBusy(false);
      setOk(true);
      onSuccess?.();
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      setBusy(false);
      const d = (axios.isAxiosError(e) ? e.response?.data : null) ?? {};
      setErr(d.error || "Could not save");
    }
  }

  return { busy, ok, err, run };
}
