import type { HabboVersionAdapter, HabboVersionId } from "../HabboVersionAdapter";
import { HabboV1Adapter } from "./HabboV1Adapter";

export { HabboV1Adapter };

export const habboVersionAdapters: readonly HabboVersionAdapter[] = [
  new HabboV1Adapter()
];

export function getHabboVersionAdapter(id: HabboVersionId): HabboVersionAdapter {
  const adapter = habboVersionAdapters.find((candidate) => candidate.id === id);
  if (!adapter) {
    throw new Error(`Unknown Habbo version adapter: ${id}`);
  }

  return adapter;
}

export function isHabboVersionId(value: string): value is HabboVersionId {
  return habboVersionAdapters.some((adapter) => adapter.id === value);
}
