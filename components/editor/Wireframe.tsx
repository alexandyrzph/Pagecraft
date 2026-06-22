import type { Block } from "@/lib/types";
import { WIREFRAME_RENDERERS, renderDefaultWireframe } from "./Wireframe.helpers";

/** A representative mini wireframe for every block type. */
export function Wireframe({ block }: { block: Block }) {
  const render = WIREFRAME_RENDERERS.get(block.type) ?? renderDefaultWireframe;
  return render(block);
}
