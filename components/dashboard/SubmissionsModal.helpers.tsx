import { Inbox, Loader2 } from "lucide-react";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";

export type Submission = {
  id: string;
  formId: string;
  data: Record<string, string>;
  createdAt: string;
};

export function buildSubmissionsCsv(columns: string[], subs: Submission[]): string {
  const headers = ["Submitted", ...columns];
  const rows = subs.map((s) => [
    new Date(s.createdAt).toLocaleString(),
    ...columns.map((c) => s.data[c] ?? ""),
  ]);
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SubmissionsBody({
  loading,
  subs,
  columns,
}: {
  loading: boolean;
  subs: Submission[];
  columns: string[];
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-sm text-zinc-400">
        <div className="rounded-2xl bg-zinc-100 p-3.5">
          <Inbox size={22} className="text-zinc-400" />
        </div>
        No submissions yet. Publish a page with a Form block and entries will appear here.
      </div>
    );
  }

  return (
    <Table>
      <THead className="sticky top-0 bg-zinc-50">
        <tr>
          <TH>Submitted</TH>
          {columns.map((c) => (
            <TH key={c}>{c}</TH>
          ))}
        </tr>
      </THead>
      <TBody>
        {subs.map((s) => (
          <TR key={s.id} className="align-top">
            <TD className="whitespace-nowrap text-zinc-400">
              {new Date(s.createdAt).toLocaleString()}
            </TD>
            {columns.map((c) => (
              <TD key={c} className="text-zinc-700">
                {s.data[c] ?? ""}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
