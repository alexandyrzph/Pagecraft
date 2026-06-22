import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DialogProvider } from "@/components/ui/dialog-provider";
import { EditItemModal } from "@/components/app-shell/cms/CollectionManager.parts";
import type { CollectionField, CollectionItem } from "@/lib/types";

const fields: CollectionField[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "link", label: "Link", type: "url" },
  { key: "body", label: "Body", type: "textarea" },
  { key: "qty", label: "Qty", type: "number" },
  { key: "active", label: "Active", type: "boolean" },
  { key: "photo", label: "Photo", type: "image" },
  { key: "when", label: "When", type: "date" },
];

const item: CollectionItem = {
  id: "i1",
  order: 0,
  data: {
    title: "Hi",
    link: "https://x",
    body: "B",
    qty: 3,
    active: true,
    photo: "/p.png",
    when: "2026-01-01",
  },
};

describe("EditItemModal", () => {
  it("renders a FieldValueInput control for every CMS field type", () => {
    render(
      <DialogProvider>
        <EditItemModal
          item={item}
          fields={fields}
          onChange={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
        />
      </DialogProvider>,
    );
    expect(screen.getByText("Edit item")).toBeInTheDocument();
    for (const f of fields) expect(screen.getByText(f.label)).toBeInTheDocument();
    expect(document.querySelector("textarea")).not.toBeNull();
    expect(document.querySelector('input[type="date"]')).not.toBeNull();
  });

  it("renders no content when there is no item (closed)", () => {
    render(
      <EditItemModal
        item={null}
        fields={fields}
        onChange={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByText("Edit item")).toBeNull();
  });
});
