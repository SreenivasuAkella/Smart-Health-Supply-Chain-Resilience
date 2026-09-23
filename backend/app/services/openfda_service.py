import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from ..config import GEMINI_API_KEY, GEMINI_MODEL, OPEN_DRUG_DATABASE_API_URL

_OPENFDA_CACHE: Dict[str, Dict[str, Any]] = {}

COMMON_NAME_MAPPINGS = {
    "paracetamol": "acetaminophen",
    "pcm": "acetaminophen",
    "crocin": "acetaminophen",
    "dolo": "acetaminophen",
    "rosycap": "rosuvastatin",
    "crestor": "rosuvastatin",
    "rabivax": "rabies",
    "asv": "snake antivenin",
    "admelog": "insulin lispro",
    "lantus": "insulin glargine",
    "novorapid": "insulin aspart",
    "augmentin": "amoxicillin",
}


def clean_medicine_search_term(raw_name: str) -> str:
    """Strips dosage forms, units, and suffixes to find the pure active substance name."""
    cleaned = re.sub(
        r'(?i)\b(tablets?|capsules?|injection|vials?|suspension|syrup|solution|drops?|cream|ointment|gel|ip|bp|usp|lyophilized|\d+\s*(mg|ml|mcg|g|iu|iu/ml|u-100))\b',
        '',
        raw_name
    )
    cleaned = re.sub(r'[^a-zA-Z\s]', ' ', cleaned).strip()
    words = [w for w in cleaned.split() if len(w) > 2]
    
    # Priority check for clinical key terms
    priority_terms = ["insulin", "rosuvastatin", "paracetamol", "acetaminophen", "amoxicillin", "artesunate", "rabies", "oxytocin", "azithromycin", "ciprofloxacin", "metformin", "atorvastatin"]
    for w in words:
        if w.lower() in priority_terms:
            return w

    # Check mapping
    for w in words:
        mapped = COMMON_NAME_MAPPINGS.get(w.lower())
        if mapped:
            return mapped

    return words[0] if words else raw_name.strip()


def query_openfda_api(search_term: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Queries live OpenFDA drug label API using multiple query strategies.
    Returns (raw_label_dict, query_url_used).
    """
    base_url = OPEN_DRUG_DATABASE_API_URL or "https://api.fda.gov/drug/label.json"
    term = clean_medicine_search_term(search_term)
    
    # Also check if term maps to an international standard
    mapped_term = COMMON_NAME_MAPPINGS.get(term.lower(), term)

    candidate_queries = [
        f'openfda.generic_name:"{mapped_term}"',
        f'openfda.substance_name:"{mapped_term}"',
        f'openfda.brand_name:"{mapped_term}"',
        f'openfda.generic_name:"{term}"',
        f'openfda.substance_name:"{term}"',
        f'openfda.brand_name:"{term}"',
        f'{mapped_term}'
    ]
    seen = set()
    queries_to_try = [q for q in candidate_queries if q and not (q in seen or seen.add(q))]

    last_url = ""
    for q in queries_to_try:
        try:
            encoded_query = urllib.parse.quote(q)
            url = f"{base_url}?search={encoded_query}&limit=1"
            last_url = url
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Sanjeevani-National-Health/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    results = data.get("results", [])
                    if results:
                        return results[0], url
        except Exception:
            continue

    return None, last_url


def analyze_openfda_with_gemini(
    openfda_doc: Dict[str, Any],
    medicine_name: str,
    query_url: str,
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Leverages Google Gemini AI to analyze raw OpenFDA drug labeling into high-value,
    actionable clinical intelligence for frontline health workers (ASHAs, ANMs, MOs).
    """
    openfda_meta = openfda_doc.get("openfda", {})
    fda_brand = (openfda_meta.get("brand_name") or [medicine_name])[0]
    fda_generic = (openfda_meta.get("generic_name") or [medicine_name])[0]
    pharm_class = (openfda_meta.get("pharm_class_epc") or openfda_meta.get("pharm_class_cs") or ["Essential Pharmaceutical"])[0]
    routes = openfda_meta.get("route", ["Standard Clinical Administration"])

    indications = (openfda_doc.get("indications_and_usage") or [""])[0][:600]
    dosage = (openfda_doc.get("dosage_and_administration") or [""])[0][:600]
    storage = (openfda_doc.get("storage_and_handling") or [""])[0][:600]
    warnings = (openfda_doc.get("warnings_and_cautions") or openfda_doc.get("warnings") or [""])[0][:600]
    interactions = (openfda_doc.get("drug_interactions") or [""])[0][:600]
    adverse = (openfda_doc.get("adverse_reactions") or [""])[0][:500]

    # Compact excerpt for AI
    raw_excerpt = {
        "medicine_queried": medicine_name,
        "fda_brand_name": fda_brand,
        "fda_generic_name": fda_generic,
        "pharmacologic_class": pharm_class,
        "routes": routes,
        "indications_and_usage": indications,
        "dosage_and_administration": dosage,
        "storage_and_handling": storage,
        "warnings_and_cautions": warnings,
        "drug_interactions": interactions,
        "adverse_reactions": adverse
    }

    active_key = custom_api_key or GEMINI_API_KEY
    if active_key:
        prompt = f"""
        You are an expert Clinical Pharmacologist & Health Supply Chain Intelligence Specialist for India's National Health Mission (Sanjeevani AI / e-Aushadhi).
        
        Analyze this authentic OpenFDA Drug Labeling document for: "{medicine_name}":
        {json.dumps(raw_excerpt, indent=2)}

        Synthesize the FDA labeling data into STRICT JSON ONLY with the following schema:
        {{
          "fda_drug_name": string (e.g. 'Admelog (Insulin Lispro)' or 'Rosuvastatin Calcium'),
          "pharmacologic_class": string (e.g. 'Insulin Analog [EPC]' or 'HMG-CoA Reductase Inhibitor'),
          "clinical_indications_summary": string (Concise 1-2 sentence clinical summary of approved indications),
          "storage_and_cold_chain_protocol": string (Specific temperature guidelines, e.g. 2°C to 8°C, protect from light, 28-day in-use discard rule),
          "is_cold_chain_strictly_required": boolean (true if requires 2°C-8°C refrigerator like insulin/vaccines, false if room temperature <30°C),
          "temperature_envelope": "COLD_CHAIN_2_TO_8_C" | "CONTROLLED_ROOM_TEMP_15_TO_30_C",
          "critical_clinical_warnings": [string] (Top 2-3 most critical safety warnings or black-box precautions for patients),
          "major_drug_interactions": [string] (Top 3-4 significant interacting drug classes to monitor),
          "adverse_reactions_summary": string (Common side effects to watch for),
          "asha_frontline_counseling_points": [string] (3 practical frontline counseling steps for ASHA workers/patients regarding administration, storage, and safety)
        }}
        """

        candidate_models = [GEMINI_MODEL, "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"]
        seen = set()
        models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

        try:
            from google import genai
            client = genai.Client(api_key=active_key)
            for m in models_to_try:
                try:
                    res = client.models.generate_content(
                        model=m,
                        contents=prompt,
                    )
                    raw_text = ""
                    try:
                        if res and getattr(res, "text", None):
                            raw_text = res.text.strip()
                    except Exception:
                        pass
                    if not raw_text and res and hasattr(res, "candidates") and res.candidates:
                        for cand in res.candidates:
                            content = getattr(cand, "content", None)
                            cand_parts = getattr(content, "parts", None) if content else None
                            if cand_parts:
                                for part in cand_parts:
                                    if hasattr(part, "text") and part.text:
                                        raw_text += part.text
                    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        parsed["openfda_source_url"] = query_url
                        parsed["ai_analyzer_engine"] = f"Google Gemini ({m} Clinical Reasoning)"
                        parsed["verified_at"] = datetime.utcnow().isoformat() + "Z"
                        return parsed
                except Exception:
                    continue
        except Exception:
            pass

        # Fallback to legacy google.generativeai if available
        try:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=active_key)
            for m in models_to_try:
                try:
                    legacy_model = genai_legacy.GenerativeModel(m)
                    res_leg = legacy_model.generate_content(prompt)
                    raw_text = res_leg.text.strip() if (res_leg and res_leg.text) else ""
                    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        parsed["openfda_source_url"] = query_url
                        parsed["ai_analyzer_engine"] = f"Google Gemini ({m} Clinical Reasoning)"
                        parsed["verified_at"] = datetime.utcnow().isoformat() + "Z"
                        return parsed
                except Exception:
                    continue
        except Exception:
            pass

    # Heuristic Fallback if Gemini is unreachable
    is_cc = any(c in fda_generic.upper() or c in medicine_name.upper() for c in ["INSULIN", "SNAKE", "ANTIVENIN", "VACCINE", "RABIES", "OXYTOCIN"])
    return {
        "fda_drug_name": f"{fda_brand} ({fda_generic})",
        "pharmacologic_class": pharm_class,
        "clinical_indications_summary": indications[:200] if indications else f"FDA-approved therapeutic agent for {fda_generic}.",
        "storage_and_cold_chain_protocol": storage[:200] if storage else ("Store at 2°C to 8°C in Ice-Lined Refrigerator. Do not freeze." if is_cc else "Store below 30°C in dry conditions."),
        "is_cold_chain_strictly_required": is_cc,
        "temperature_envelope": "COLD_CHAIN_2_TO_8_C" if is_cc else "CONTROLLED_ROOM_TEMP_15_TO_30_C",
        "critical_clinical_warnings": [w.strip() for w in warnings.split(".")[:2] if len(w.strip()) > 10] or ["Verify label and dosage prior to administration."],
        "major_drug_interactions": [i.strip() for i in interactions.split(".")[:2] if len(i.strip()) > 10] or ["Consult prescribing physician for concomitant medications."],
        "adverse_reactions_summary": adverse[:200] if adverse else "Refer to product prescribing leaflet.",
        "asha_frontline_counseling_points": [
            "Instruct patient on correct administration timing and adherence.",
            "Verify storage temperatures and protect from thermal degradation.",
            "Report any adverse events or allergic reactions to the Medical Officer."
        ],
        "openfda_source_url": query_url,
        "ai_analyzer_engine": "OpenFDA Clinical Label Extractor",
        "verified_at": datetime.utcnow().isoformat() + "Z"
    }


def get_openfda_clinical_insights(
    medicine_name: str,
    generic_name: Optional[str] = None,
    custom_api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Main entry point: fetches OpenFDA drug labeling by medicine or generic name,
    runs Gemini AI clinical analysis, and caches the result.
    """
    search_key = (generic_name or medicine_name or "").strip()
    if not search_key:
        return None

    clean_key = clean_medicine_search_term(search_key).lower()
    if clean_key in _OPENFDA_CACHE:
        return _OPENFDA_CACHE[clean_key]

    # 1. Query OpenFDA
    fda_doc, query_url = query_openfda_api(search_key)
    if not fda_doc and generic_name and generic_name != medicine_name:
        fda_doc, query_url = query_openfda_api(generic_name)

    if not fda_doc:
        # Generate grounded baseline if API unreachable
        return None

    # 2. Analyze with Gemini
    clinical_analysis = analyze_openfda_with_gemini(fda_doc, medicine_name, query_url, custom_api_key)
    if clinical_analysis:
        _OPENFDA_CACHE[clean_key] = clinical_analysis

    return clinical_analysis
