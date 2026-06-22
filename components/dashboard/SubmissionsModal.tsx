"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  type Submission,
  SubmissionsBody,
  buildSubmissionsCsv,
  downloadCsv,
} from "./SubmissionsModal.helpers";

export function SubmissionsModal({
  page,
  onClose,
}: {
  page: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ pageId: string; subs: Submission[] } | null>(null);

  // Retain the last page so the header stays populated through the exit animation.
  const [lastPage, setLastPage] = useState(page);
  if (page && page.id !== lastPage?.id) setLastPage(page);
  const view = page ?? lastPage;

  useEffect(() => {
    if (!page) return;
    const pageId = page.id;
    let active = true;
    api
      .get(endpoints.submissions.byPage(pageId))
      .then((r) => r.data)
      .then((d) => {
        if (active) setData({ pageId, subs: Array.isArray(d) ? d : [] });
      })
      .catch(() => {
        if (active) setData({ pageId, subs: [] });
      });
    return () => {
      active = false;
    };
  }, [page]);

  const subs = data && view && data.pageId === view.id ? data.subs : [];
  const loading = !!page && (!data || data.pageId !== page.id);
  const columns = Array.from(new Set(subs.flatMap((s) => Object.keys(s.data))));

  function exportCsv() {
    const csv = buildSubmissionsCsv(columns, subs);
    downloadCsv(csv, `submissions-${page?.id}.csv`);
  }

  return (
    <Modal
      open={!!page}
      onClose={onClose}
      className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-zinc-900">Submissions</h2>
          <p className="text-xs text-zinc-400">
            {view?.title} · {subs.length} {subs.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {subs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onPress={exportCsv}
              leadingIcon={<Download size={13} />}
            >
              CSV
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Close" onPress={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SubmissionsBody loading={loading} subs={subs} columns={columns} />
      </div>
    </Modal>
  );
}
