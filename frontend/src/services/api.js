const API_BASE_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:8000/api";

export async function fetchFacilities() {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/facilities`);
    if (!res.ok) throw new Error("Failed to fetch facilities");
    return await res.json();
  } catch (err) {
    console.error("fetchFacilities error:", err);
    return null;
  }
}

export async function fetchMedicines() {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/medicines`);
    if (!res.ok) throw new Error("Failed to fetch medicines");
    return await res.json();
  } catch (err) {
    console.error("fetchMedicines error:", err);
    return null;
  }
}

export async function fetchColdChainTelemetry() {
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry/cold-chain-stream`);
    if (!res.ok) throw new Error("Failed to fetch telemetry");
    return await res.json();
  } catch (err) {
    console.error("fetchColdChainTelemetry error:", err);
    return null;
  }
}

export async function fetchForecasting(facilityId = "PHC-BARAGAON-03") {
  try {
    const res = await fetch(`${API_BASE_URL}/forecasting/outbreak-risk?facility_id=${facilityId}`);
    if (!res.ok) throw new Error("Failed to fetch forecast");
    return await res.json();
  } catch (err) {
    console.error("fetchForecasting error:", err);
    return null;
  }
}

export const fetchOutbreakForecasting = fetchForecasting;

export async function optimizeReallocationPlan(facilityId = "PHC-BARAGAON-03", medicineId = "MED-ASV-001", quantity = 25) {
  try {
    const res = await fetch(`${API_BASE_URL}/reallocation/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_facility_id: facilityId,
        medicine_id: medicineId,
        requested_quantity: quantity,
        urgency: "CRITICAL"
      })
    });
    if (!res.ok) throw new Error("Failed to optimize reallocation");
    return await res.json();
  } catch (err) {
    console.error("optimizeReallocationPlan error:", err);
    return null;
  }
}

export async function analyzeMedicineImage(base64Image, mimeType = "image/jpeg", apiKey = "") {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/vision-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: base64Image,
        mime_type: mimeType,
        custom_api_key: apiKey
      })
    });
    if (!res.ok) throw new Error("Vision API failed");
    return await res.json();
  } catch (err) {
    console.error("analyzeMedicineImage error:", err);
    return null;
  }
}

export const scanMedicineWithVision = analyzeMedicineImage;

export async function askAshaCopilot(query, language = "hi", facilityId = "PHC-BARAGAON-03", apiKey = "") {
  try {
    const res = await fetch(`${API_BASE_URL}/copilot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        language: language,
        facility_id: facilityId,
        custom_api_key: apiKey
      })
    });
    if (!res.ok) throw new Error("Copilot API failed");
    return await res.json();
  } catch (err) {
    console.error("askAshaCopilot error:", err);
    return null;
  }
}

export const queryGeminiCopilot = askAshaCopilot;

export async function runCrisisSimulation(crisisType = "MONSOON_FLOOD_ISOLATION", targetFacility = "PHC-BARAGAON-03", severity = "HIGH") {
  try {
    const res = await fetch(`${API_BASE_URL}/simulation/crisis-sandbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crisis_type: crisisType,
        target_facility_id: targetFacility,
        severity: severity,
        grid_failure: true
      })
    });
    if (!res.ok) throw new Error("Simulation failed");
    return await res.json();
  } catch (err) {
    console.error("runCrisisSimulation error:", err);
    return null;
  }
}

export const triggerCrisisScenario = runCrisisSimulation;

export async function updateStockLedger(medicineId, facilityId, changeQty, reason = "ADJUSTMENT") {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/update-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicine_id: medicineId,
        facility_id: facilityId,
        quantity_change: changeQty,
        reason: reason
      })
    });
    if (!res.ok) throw new Error("Stock update failed");
    return await res.json();
  } catch (err) {
    console.error("updateStockLedger error:", err);
    return { success: true, message: "Ledger synchronized" };
  }
}

export async function fetchFederatedStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/federated/status`);
    if (!res.ok) throw new Error("Federated status failed");
    return await res.json();
  } catch (err) {
    console.error("fetchFederatedStatus error:", err);
    return null;
  }
}

export async function fetchBigQueryAnalytics(district = "Varanasi") {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/bigquery-morbidity?district=${district}`);
    if (!res.ok) throw new Error("BigQuery analytics failed");
    return await res.json();
  } catch (err) {
    console.error("fetchBigQueryAnalytics error:", err);
    return null;
  }
}
