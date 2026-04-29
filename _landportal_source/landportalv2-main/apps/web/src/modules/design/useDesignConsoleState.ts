import { useMemo, useState } from "react";

export type DesignConsoleTab = "parcel" | "subdivision" | "site" | "overlays" | "block" | "sheet";

export function useDesignConsoleState() {
  const [activeTab, setActiveTab] = useState<DesignConsoleTab>("parcel");
  const [searchQuery, setSearchQuery] = useState("");
  const [minorInterval, setMinorInterval] = useState(2);
  const [majorEvery, setMajorEvery] = useState(5);
  const [showContourLabels, setShowContourLabels] = useState(true);
  const [contoursGenerated, setContoursGenerated] = useState(false);

  return useMemo(() => ({
    activeTab,
    contoursGenerated,
    majorEvery,
    minorInterval,
    searchQuery,
    setActiveTab,
    setContoursGenerated,
    setMajorEvery,
    setMinorInterval,
    setSearchQuery,
    setShowContourLabels,
    showContourLabels,
  }), [activeTab, contoursGenerated, majorEvery, minorInterval, searchQuery, showContourLabels]);
}
