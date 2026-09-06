export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();

  // If already in YYYY-MM-DD format
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, "-");
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }

  // Fallback: strip T... e.g. 2018-01-05T02:20:40+08:00 -> 2018-01-05
  if (trimmed.includes("T")) {
    return trimmed.split("T")[0];
  }

  return trimmed;
};
