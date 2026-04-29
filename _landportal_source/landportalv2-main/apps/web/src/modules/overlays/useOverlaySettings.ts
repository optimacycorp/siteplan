import { useMemo, useState } from "react";

import { overlayRegistry, type OverlayCategory, type OverlayDefinition } from "@landportal/map-core";

export type OverlaySettings = Record<string, { visible: boolean; opacity: number }>;
export type GroupedOverlays = Record<OverlayCategory, OverlayDefinition[]>;

export function useOverlaySettings() {
  const [settings, setSettings] = useState<OverlaySettings>(() =>
    Object.fromEntries(
      overlayRegistry.map((overlay) => [
        overlay.key,
        { visible: overlay.defaultVisible, opacity: overlay.defaultOpacity },
      ]),
    ),
  );

  const grouped = useMemo(() => {
    const initial: GroupedOverlays = {
      parcel: [],
      constraint: [],
      site: [],
      survey: [],
    };

    for (const overlay of overlayRegistry) {
      initial[overlay.category] = [...initial[overlay.category], overlay];
    }

    return initial;
  }, []);

  return {
    grouped,
    settings,
    setOpacity: (key: string, opacity: number) =>
      setSettings((current) => ({
        ...current,
        [key]: { ...current[key], opacity },
      })),
    setVisible: (key: string, visible: boolean) =>
      setSettings((current) => ({
        ...current,
        [key]: { ...current[key], visible },
      })),
    toggle: (key: string) =>
      setSettings((current) => ({
        ...current,
        [key]: { ...current[key], visible: !current[key]?.visible },
      })),
  };
}
