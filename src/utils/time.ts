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

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();

  // 1. If it matches ISO format with time e.g. "2018-01-05T02:20:40+08:00" -> "2018-01-05 02:20"
  const isoMatch = trimmed.match(/^(\d{4}[-/]\d{2}[-/]\d{2})[T\s](\d{2}:\d{2})/);
  if (isoMatch) {
    const datePart = isoMatch[1].replace(/\//g, "-");
    const timePart = isoMatch[2];
    return `${datePart} ${timePart}`;
  }

  // 2. Try Date parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  } catch {
    // fallback
  }

  return trimmed;
};

export const formatDate = (dateStr?: string | null): string => {
  return formatDateTime(dateStr);
};
