/**
 * Utility mappers and formatters for ASHA Voice Copilot & Logistics Platform.
 */

// Intent and Status Human-Readable Label Mapper
export const BACKEND_INTENT_MAP = {
  GENERAL_QUERY: 'General Inquiry',
  STOCK_STATUS_CHECK: 'Stock Audit Check',
  FACILITY_SELECTION: 'Facility Selection',
  EMERGENCY_REQUISITION: 'Emergency Requisition',
  COLD_CHAIN_EXCURSION: 'Cold-Chain Alert',
  INTER_HOSPITAL_TRANSFER: 'Inter-Hospital Transfer',
  INTER_FACILITY_TRANSFER: 'Inter-Facility Transfer',
  EPIDEMIC_SURGE: 'Epidemic Surveillance',
  OUTBREAK_ALERT: 'Outbreak Alert',
  CLINICAL_PROTOCOL_INQUIRY: 'Clinical Protocol',
  MULTIMODAL_INSPECTION: 'Visual Inspection',
  VISUAL_INSPECTION: 'Visual Inspection',
  TECHNICIAN_DISPATCH: 'Technician Dispatch',
  CREATE_DISPATCH_ORDER: 'Dispatch Order',
  AWAITING_CLARIFICATION: 'Clarification Needed',
  READY_FOR_EXECUTION: 'Ready for Dispatch',
  EXECUTED: 'Executed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  SUCCESS: 'Success',
  ERROR: 'System Error',
  UNKNOWN: 'General Request'
};

/**
 * Maps a raw backend constant or intent name into a human-readable title.
 * e.g., "GENERAL_QUERY" -> "General Inquiry"
 * e.g., "CUSTOM_UNMAPPED_NAME" -> "Custom Unmapped Name"
 */
export function mapBackendName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (BACKEND_INTENT_MAP[trimmed]) {
    return BACKEND_INTENT_MAP[trimmed];
  }

  // Fallback: Convert UPPER_SNAKE_CASE or snake_case to Title Case
  if (trimmed.includes('_')) {
    return trimmed
      .split('_')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return trimmed;
}

/**
 * Formats a raw timestamp (ISO string with microseconds, unix ms, or date string)
 * into a clean, human-friendly local time format (e.g. "11:24 AM" or "18 Sep, 11:24 AM").
 */
export function formatCopilotTime(timestamp) {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If already formatted like "11:24 AM" or "11:24" without date components
  if (typeof timestamp === 'string' && /^\d{1,2}:\d{2}(\s*[APap][Mm])?$/.test(timestamp.trim())) {
    return timestamp.trim();
  }

  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      // If parsing failed, return string truncated or fallback
      return String(timestamp).slice(0, 10);
    }

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (isToday) {
      return timeStr;
    }

    const dateStr = d.toLocaleDateString([], {
      day: 'numeric',
      month: 'short'
    });

    return `${dateStr}, ${timeStr}`;
  } catch (_) {
    return String(timestamp);
  }
}
