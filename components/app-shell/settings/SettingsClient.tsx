"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2 } from "lucide-react";
import { useConfirm, useAlert } from "@/components/ui/dialog-provider";
import { Button, TextField, Select } from "@/components/ui";

type WS = { id: string; name: string; slug: string };
type Member = { membershipId: string; userId: string; name: string; email: string; role: string };
type Invite = { id: string; email: string; role: string; token: string; expiresAt: string };
const ROLES = ["VIEWER", "EDITOR", "ADMIN", "OWNER"];

export function SettingsClient({ workspace, role }: { workspace: WS; role: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "members" | "invites" | "danger">("general");
  const tabs: Array<"general" | "members" | "invites" | "danger"> =
    role === "OWNER" ? ["general", "members", "invites", "danger"] : ["general", "members", "invites"];
  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-fg-muted hover:text-fg"}`}>{t}</button>
        ))}
      </div>
      <div className="py-6">
        {tab === "general" && <General workspace={workspace} onSaved={() => router.refresh()} />}
        {tab === "members" && <Members />}
        {tab === "invites" && <Invites />}
        {tab === "danger" && <Danger workspace={workspace} role={role} />}
      </div>
    </>
  );
}

function General({ workspace, onSaved }: { workspace: WS; onSaved: () => void }) {
  const [name, setName] = useState(workspace.name);
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(false); const [err, setErr] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setOk(false); setErr("");
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    setBusy(false);
    if (res && res.ok) { setOk(true); onSaved(); setTimeout(() => setOk(false), 1500); }
    else { const d = res ? await res.json().catch(() => ({})) : {}; setErr(d.error || "Could not save"); }
  }
  return (
    <form onSubmit={save} className="max-w-sm space-y-3">
      <TextField label="Workspace name" value={name} onChange={setName} isRequired />
      {err && <p className="text-xs text-danger-600">{err}</p>}
      <Button type="submit" variant="neutral" isLoading={busy} leadingIcon={ok ? <Check size={15} /> : undefined}>Save</Button>
    </form>
  );
}

function Members() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [members, setMembers] = useState<Member[]>([]);
  const load = () => fetch("/api/workspaces/members").then((r) => r.json()).then((d) => Array.isArray(d) && setMembers(d));
  useEffect(() => { load(); }, []);
  async function changeRole(m: Member, role: string) {
    const res = await fetch("/api/workspaces/members", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ membershipId: m.membershipId, role }) }).catch(() => null);
    if (res && !res.ok) { const d = await res.json().catch(() => ({})); await alert({ title: "Couldn't change role", message: d.error || "Please try again." }); }
    load();
  }
  async function remove(m: Member) {
    const ok = await confirm({ title: "Remove member?", message: `${m.email} will lose access to this workspace.`, confirmLabel: "Remove", destructive: true });
    if (!ok) return;
    const res = await fetch(`/api/workspaces/members?membershipId=${m.membershipId}`, { method: "DELETE" }).catch(() => null);
    if (res && !res.ok) { const d = await res.json().catch(() => ({})); await alert({ title: "Couldn't remove member", message: d.error || "Please try again." }); }
    load();
  }
  return (
    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
      {members.map((m) => (
        <div key={m.membershipId} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">{(m.name || m.email).slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-800">{m.name || "—"}</p><p className="truncate text-xs text-zinc-400">{m.email}</p></div>
          <Select aria-label={`Role for ${m.email}`} className="w-36" items={ROLES.map((r) => ({ id: r, label: r }))} selectedKey={m.role} onSelectionChange={(k) => changeRole(m, String(k))} />
          <Button aria-label={`Remove ${m.email}`} variant="ghost" size="icon" onPress={() => remove(m)} className="text-fg-subtle hover:bg-danger-50 hover:text-danger-500"><Trash2 size={15} /></Button>
        </div>
      ))}
    </div>
  );
}

function Invites() {
  const alert = useAlert();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState(""); const [role, setRole] = useState("EDITOR");
  const [busy, setBusy] = useState(false); const [link, setLink] = useState(""); const [copied, setCopied] = useState(false); const [err, setErr] = useState("");
  const load = () => fetch("/api/workspaces/invites").then((r) => r.json()).then((d) => Array.isArray(d) && setInvites(d));
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(""); setLink("");
    const res = await fetch("/api/workspaces/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setLink(d.inviteUrl); setEmail(""); load(); } else setErr(d.error || "Failed");
  }
  async function revoke(id: string) { const res = await fetch(`/api/workspaces/invites?id=${id}`, { method: "DELETE" }).catch(() => null); if (res && !res.ok) await alert({ title: "Couldn't revoke invite", message: "Please try again." }); load(); }
  return (
    <div className="space-y-5">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <TextField className="flex-1" label="Invite by email" type="email" placeholder="teammate@company.com" value={email} onChange={setEmail} isRequired />
        <Select aria-label="Invite role" className="w-32" items={["VIEWER", "EDITOR", "ADMIN"].map((r) => ({ id: r, label: r }))} selectedKey={role} onSelectionChange={(k) => setRole(String(k))} />
        <Button type="submit" variant="neutral" isLoading={busy}>Invite</Button>
      </form>
      {err && <p className="text-xs text-danger-600">{err}</p>}
      {link && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-1.5 text-xs font-medium text-emerald-800">No email service configured — share this invite link:</p>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2">
            <code className="min-w-0 flex-1 truncate text-xs text-zinc-600">{link}</code>
            <Button variant="neutral" size="sm" onPress={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} leadingIcon={copied ? <Check size={12} /> : <Copy size={12} />}>{copied ? "Copied" : "Copy"}</Button>
          </div>
        </div>
      )}
      {invites.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {invites.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-700">{i.email}</p><p className="text-xs text-zinc-400">{i.role} · pending</p></div><Button variant="link" onPress={() => revoke(i.id)} className="text-xs font-medium text-danger-600">Revoke</Button></div>
          ))}
        </div>
      )}
    </div>
  );
}

function Danger({ workspace, role }: { workspace: WS; role: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function del() {
    const ok = await confirm({
      title: "Delete workspace?",
      message: `"${workspace.name}" will be permanently deleted, along with its pages, CMS, and assets. This cannot be undone.`,
      confirmLabel: "Delete workspace",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { router.push("/"); router.refresh(); } else { setErr(d.error || "Failed"); setBusy(false); }
  }
  if (role !== "OWNER") return <p className="text-sm text-zinc-500">Only the workspace owner can delete the workspace.</p>;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <h3 className="text-sm font-semibold text-red-800">Delete this workspace</h3>
      <p className="mt-1 text-xs text-red-600">Permanent. You must have another workspace to switch to.</p>
      {err && <p className="mt-2 text-xs text-danger-700">{err}</p>}
      <Button variant="danger" onPress={del} isLoading={busy} leadingIcon={<Trash2 size={15} />} className="mt-3">Delete workspace</Button>
    </div>
  );
}
