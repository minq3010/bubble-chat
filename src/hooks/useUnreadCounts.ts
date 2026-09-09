import { useEffect, useState } from "react";
import { desktop } from "../desktop/bridge";

export type ProviderUnread = { messenger: number; zalo: number };

const EMPTY: ProviderUnread = { messenger: 0, zalo: 0 };

export function useUnreadCounts(): ProviderUnread {
  const [counts, setCounts] = useState<ProviderUnread>(EMPTY);

  useEffect(() => desktop()?.onUnread(setCounts), []);

  return counts;
}

export const totalUnread = (counts: ProviderUnread) => counts.messenger + counts.zalo;
