import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  score,
  buildInsertCommands,
  buildActionCommands,
  buildCommands,
  filterCommands,
  groupCommands,
  nextIndex,
  prevIndex,
  type Command,
  type CommandActionHandlers,
} from "@/components/editor/CommandPalette.helpers";
import { CATEGORIES, getDefinition } from "@/lib/blocks/registry";
import { useEditor } from "@/store/editor-store";

function handlers(): CommandActionHandlers {
  return {
    onSave: vi.fn(),
    onExport: vi.fn(),
    onPublish: vi.fn(),
    goHome: vi.fn(),
  };
}

function seed() {
  useEditor.getState().init({ id: "p1", title: "T", slug: "t", published: false, tree: [] });
}

describe("score", () => {
  it("returns 0 for an empty query (everything matches equally)", () => {
    expect(score("", "Heading")).toBe(0);
  });

  it("ranks a prefix substring higher than a later substring", () => {
    expect(score("head", "Heading")).toBe(100);
    expect(score("ing", "Heading")).toBe(100 - "heading".indexOf("ing"));
    expect(score("head", "Heading")).toBeGreaterThan(score("ing", "Heading"));
  });

  it("matches a subsequence with a low positive score", () => {
    expect(score("hdg", "Heading")).toBe(1);
  });

  it("returns -1 when the subsequence cannot be formed", () => {
    expect(score("xyz", "Heading")).toBe(-1);
  });

  it("is case-insensitive", () => {
    expect(score("HEAD", "heading")).toBe(100);
  });
});

describe("nextIndex / prevIndex", () => {
  it("clamps next to the last index", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(2);
  });

  it("clamps prev to zero", () => {
    expect(prevIndex(1)).toBe(0);
    expect(prevIndex(0)).toBe(0);
  });
});

describe("buildInsertCommands", () => {
  it("emits one command per registered palette type in order", () => {
    const expected = CATEGORIES.flatMap((c) =>
      c.types.filter((t) => getDefinition(t)).map((t) => `insert:${t}`),
    );
    const cmds = buildInsertCommands();
    expect(cmds.map((c) => c.id)).toEqual(expected);
    expect(cmds.every((c) => c.group === "Insert block")).toBe(true);
  });

  it('labels each command "Add <definition label>"', () => {
    const cmds = buildInsertCommands();
    const heading = cmds.find((c) => c.id === "insert:heading");
    expect(heading?.label).toBe(`Add ${getDefinition("heading")?.label}`);
  });

  it("run() appends the block to the end of the tree", () => {
    seed();
    const cmds = buildInsertCommands();
    const headingCmd = cmds.find((c) => c.id === "insert:heading") as Command;
    expect(useEditor.getState().tree.length).toBe(0);
    headingCmd.run();
    const tree = useEditor.getState().tree;
    expect(tree.length).toBe(1);
    expect(tree[0].type).toBe("heading");
  });
});

describe("buildActionCommands", () => {
  beforeEach(() => seed());

  it("includes the fixed view/edit/page actions in order", () => {
    const ids = buildActionCommands(handlers()).map((c) => c.id);
    expect(ids).toEqual([
      "vp:desktop",
      "vp:tablet",
      "vp:mobile",
      "preview",
      "undo",
      "redo",
      "dup",
      "del",
      "save",
      "publish",
      "export",
      "home",
    ]);
  });

  it("wires save/publish/export/home to the passed handlers", () => {
    const h = handlers();
    const cmds = buildActionCommands(h);
    cmds.find((c) => c.id === "save")?.run();
    cmds.find((c) => c.id === "publish")?.run();
    cmds.find((c) => c.id === "export")?.run();
    cmds.find((c) => c.id === "home")?.run();
    expect(h.onSave).toHaveBeenCalledTimes(1);
    expect(h.onPublish).toHaveBeenCalledTimes(1);
    expect(h.onExport).toHaveBeenCalledTimes(1);
    expect(h.goHome).toHaveBeenCalledTimes(1);
  });

  it("desktop/tablet/mobile actions set the viewport", () => {
    const cmds = buildActionCommands(handlers());
    cmds.find((c) => c.id === "vp:tablet")?.run();
    expect(useEditor.getState().viewport).toBe("tablet");
    cmds.find((c) => c.id === "vp:mobile")?.run();
    expect(useEditor.getState().viewport).toBe("mobile");
    cmds.find((c) => c.id === "vp:desktop")?.run();
    expect(useEditor.getState().viewport).toBe("desktop");
  });

  it("preview action toggles preview mode", () => {
    const before = useEditor.getState().previewMode;
    buildActionCommands(handlers())
      .find((c) => c.id === "preview")
      ?.run();
    expect(useEditor.getState().previewMode).toBe(!before);
  });

  it("duplicate action duplicates the selected block; no-op without a selection", () => {
    const cmds = buildActionCommands(handlers());
    const dup = cmds.find((c) => c.id === "dup") as Command;

    useEditor.getState().select(null);
    dup.run();
    expect(useEditor.getState().tree.length).toBe(0);

    useEditor.getState().addBlock("heading", null, 0);
    const id = useEditor.getState().tree[0].id;
    useEditor.getState().select(id);
    dup.run();
    expect(useEditor.getState().tree.length).toBe(2);
  });

  it("delete action removes the selected block; no-op without a selection", () => {
    const cmds = buildActionCommands(handlers());
    const del = cmds.find((c) => c.id === "del") as Command;

    useEditor.getState().select(null);
    del.run();

    useEditor.getState().addBlock("heading", null, 0);
    const id = useEditor.getState().tree[0].id;
    useEditor.getState().select(id);
    expect(useEditor.getState().tree.length).toBe(1);
    del.run();
    expect(useEditor.getState().tree.length).toBe(0);
  });

  it("undo / redo step the history", () => {
    const cmds = buildActionCommands(handlers());
    useEditor.getState().addBlock("heading", null, 0);
    expect(useEditor.getState().tree.length).toBe(1);
    cmds.find((c) => c.id === "undo")?.run();
    expect(useEditor.getState().tree.length).toBe(0);
    cmds.find((c) => c.id === "redo")?.run();
    expect(useEditor.getState().tree.length).toBe(1);
  });
});

describe("buildCommands", () => {
  it("places action commands before insert commands", () => {
    const cmds = buildCommands(handlers());
    const firstInsert = cmds.findIndex((c) => c.group === "Insert block");
    const lastAction = cmds.map((c) => c.group).lastIndexOf("Page");
    expect(lastAction).toBeLessThan(firstInsert);
    expect(cmds.length).toBe(buildActionCommands(handlers()).length + buildInsertCommands().length);
  });
});

describe("filterCommands", () => {
  const cmds = buildCommands(handlers());

  it("returns the full list unchanged for an empty query", () => {
    expect(filterCommands(cmds, "")).toBe(cmds);
  });

  it("filters out commands that do not match at all", () => {
    const out = filterCommands(cmds, "zzzzzz");
    expect(out).toEqual([]);
  });

  it("ranks a direct label match ahead of a keyword-only match", () => {
    const out = filterCommands(cmds, "save");
    expect(out[0]?.id).toBe("save");
  });

  it("matches against keywords (with the -1 penalty) when the label does not", () => {
    const layoutType = CATEGORIES.find((c) => c.name === "Layout")?.types[0] as string;
    const out = filterCommands(cmds, "Layout");
    expect(out.some((c) => c.id === `insert:${layoutType}`)).toBe(true);
  });
});

describe("groupCommands", () => {
  it("buckets commands by group, preserving first-seen order", () => {
    const a: Command[] = [
      { id: "1", group: "View", label: "a", icon: (() => null) as never, run: () => {} },
      { id: "2", group: "Edit", label: "b", icon: (() => null) as never, run: () => {} },
      { id: "3", group: "View", label: "c", icon: (() => null) as never, run: () => {} },
    ];
    const grouped = groupCommands(a);
    expect(grouped.map(([g]) => g)).toEqual(["View", "Edit"]);
    expect(grouped[0][1].map((c) => c.id)).toEqual(["1", "3"]);
    expect(grouped[1][1].map((c) => c.id)).toEqual(["2"]);
  });

  it("returns an empty array for no results", () => {
    expect(groupCommands([])).toEqual([]);
  });
});
