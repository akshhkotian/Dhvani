"""
Dhvani - Translation & Transliteration Service
===============================================
High-Accuracy Neural Machine Translation and Phonetic Transliteration Engine.

Key Capabilities:
1. Google Neural Machine Translation (NMT) with fallback redundancy.
2. Indic-to-English Phonetic Transliteration (Romanization):
   Converts Indian scripts (Kannada, Telugu, Hindi, Tamil, etc.) into natural,
   fluent English alphabet letters (e.g. "ನಾನು" -> "naanu" / "nanu").
3. Multi-Target Language Translation:
   Translates into multiple selected target languages simultaneously in a single call.
"""

import os
import re
import html
import time
import logging
import unicodedata
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, List, Union

logger = logging.getLogger("dhvani.translator")
logging.basicConfig(level=logging.INFO)

# Supported language catalog
SUPPORTED_LANGUAGES: Dict[str, Dict[str, Any]] = {
    "kn": {
        "code": "kn",
        "name": "Kannada",
        "native": "ಕನ್ನಡ",
        "speech_code": "kn-IN",
        "has_transliteration": True,
        "region": "Karnataka, India"
    },
    "te": {
        "code": "te",
        "name": "Telugu",
        "native": "తెలుగు",
        "speech_code": "te-IN",
        "has_transliteration": True,
        "region": "Andhra Pradesh & Telangana, India"
    },
    "hi": {
        "code": "hi",
        "name": "Hindi",
        "native": "हिन्दी",
        "speech_code": "hi-IN",
        "has_transliteration": True,
        "region": "India"
    },
    "ta": {
        "code": "ta",
        "name": "Tamil",
        "native": "தமிழ்",
        "speech_code": "ta-IN",
        "has_transliteration": True,
        "region": "Tamil Nadu, India & Sri Lanka"
    },
    "ml": {
        "code": "ml",
        "name": "Malayalam",
        "native": "മലയാളം",
        "speech_code": "ml-IN",
        "has_transliteration": True,
        "region": "Kerala, India"
    },
    "mr": {
        "code": "mr",
        "name": "Marathi",
        "native": "मराठी",
        "speech_code": "mr-IN",
        "has_transliteration": True,
        "region": "Maharashtra, India"
    },
    "bn": {
        "code": "bn",
        "name": "Bengali",
        "native": "বাংলা",
        "speech_code": "bn-IN",
        "has_transliteration": True,
        "region": "West Bengal, India & Bangladesh"
    },
    "gu": {
        "code": "gu",
        "name": "Gujarati",
        "native": "ગુજરાતી",
        "speech_code": "gu-IN",
        "has_transliteration": True,
        "region": "Gujarat, India"
    },
    "en": {
        "code": "en",
        "name": "English",
        "native": "English",
        "speech_code": "en-US",
        "has_transliteration": False,
        "region": "Global"
    },
    "es": {
        "code": "es",
        "name": "Spanish",
        "native": "Español",
        "speech_code": "es-ES",
        "has_transliteration": False,
        "region": "Spain & Latin America"
    }
}

# Diacritic phonetic mapping for natural English alphabet conversion
DIACRITIC_MAP_FRIENDLY = {
    'ā': 'aa', 'Ā': 'Aa',
    'ī': 'ee', 'Ī': 'Ee',
    'ū': 'oo', 'Ū': 'Oo',
    'ē': 'e',  'Ē': 'E',
    'ō': 'o',  'Ō': 'O',
    'ś': 'sh', 'Ś': 'Sh',
    'ṣ': 'sh', 'Ṣ': 'Sh',
    'ṇ': 'n',  'Ṇ': 'N',
    'ḷ': 'l',  'Ḷ': 'L',
    'ṭ': 't',  'Ṭ': 'T',
    'ḍ': 'd',  'Ḍ': 'D',
    'ṅ': 'ng', 'Ṅ': 'Ng',
    'ñ': 'ny', 'Ñ': 'Ny',
    'ṛ': 'ri', 'Ṛ': 'Ri',
    'ḥ': 'h',  'Ḥ': 'H',
    'ṃ': 'm',  'Ṃ': 'M'
}

DIACRITIC_MAP_SIMPLE = {
    'ā': 'a', 'Ā': 'A',
    'ī': 'i', 'Ī': 'I',
    'ū': 'u', 'Ū': 'U',
    'ē': 'e', 'Ē': 'E',
    'ō': 'o', 'Ō': 'O',
    'ś': 'sh', 'Ś': 'Sh',
    'ṣ': 'sh', 'Ṣ': 'Sh',
    'ṇ': 'n',  'Ṇ': 'N',
    'ḷ': 'l',  'Ḷ': 'L',
    'ṭ': 't',  'Ṭ': 'T',
    'ḍ': 'd',  'Ḍ': 'D',
    'ṅ': 'ng', 'Ṅ': 'Ng',
    'ñ': 'ny', 'Ñ': 'Ny',
    'ṛ': 'ri', 'Ṛ': 'Ri',
    'ḥ': 'h',  'Ḥ': 'H',
    'ṃ': 'm',  'Ṃ': 'M'
}

# Create persistent session with retry capabilities
session = requests.Session()
retries = Retry(total=3, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries)
session.mount('https://', adapter)
session.mount('http://', adapter)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}
REQUEST_TIMEOUT = 12


def get_supported_languages() -> List[Dict[str, Any]]:
    """Returns list of supported languages."""
    return list(SUPPORTED_LANGUAGES.values())


def normalize_lang_code(code: str) -> str:
    """Normalize language code to 2-letter base code (e.g. 'kn-IN' -> 'kn')."""
    if not code:
        return "en"
    cleaned = code.strip().lower()
    if cleaned in SUPPORTED_LANGUAGES:
        return cleaned
    base = cleaned.split("-")[0].split("_")[0]
    if base in SUPPORTED_LANGUAGES:
        return base
    for k, v in SUPPORTED_LANGUAGES.items():
        if v["speech_code"].lower() == cleaned:
            return k
    return base


def clean_phonetic_english(text: str, mode: str = "friendly") -> str:
    """
    Transforms Romanized Indic text (often full of diacritics like ā, ī, ō, ś)
    into readable, natural English alphabet letters.
    Modes:
      - 'friendly': Converts 'ā' -> 'aa' (e.g. "Nānu" -> "Naanu", "hōguttiddēne" -> "hoguttiddene")
      - 'simple': Converts 'ā' -> 'a' (e.g. "Nānu" -> "Nanu")
    """
    if not text:
        return ""

    result = text
    mapping = DIACRITIC_MAP_FRIENDLY if mode == "friendly" else DIACRITIC_MAP_SIMPLE
    for char, replacement in mapping.items():
        result = result.replace(char, replacement)

    # Strip any residual combining diacritical marks
    decomposed = unicodedata.normalize('NFKD', result)
    cleaned = ''.join(c for c in decomposed if not unicodedata.combining(c))
    return cleaned.strip()


def _translate_and_romanize_google(text: str, source_code: str, target_code: str) -> Dict[str, str]:
    """
    Translates text chunk and simultaneously retrieves Romanized transliteration.
    """
    url = "https://clients5.google.com/translate_a/single"
    params = [
        ("client", "dict-chrome-ex"),
        ("sl", source_code),
        ("tl", target_code),
        ("dt", "t"),
        ("dt", "rm"),
        ("q", text)
    ]

    resp = session.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(f"Google Translate API responded with status {resp.status_code}")

    data = resp.json()
    translated_parts = []
    romanized_parts = []

    if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
        for item in data[0]:
            if not isinstance(item, list):
                continue
            if len(item) > 0 and item[0]:
                translated_parts.append(item[0])
            if len(item) > 2 and item[2]:
                romanized_parts.append(item[2])
            elif len(item) > 3 and item[3]:
                romanized_parts.append(item[3])

    full_translated = "".join(translated_parts).strip()
    full_roman = " ".join([r.strip() for r in romanized_parts if r.strip()]).strip()

    # Fallback if no translation returned
    if not full_translated and text.strip():
        full_translated = text.strip()

    # If target language is English or Latin, Roman is identical to translated
    if target_code in ["en", "es"] and not full_roman:
        full_roman = full_translated

    friendly_english = clean_phonetic_english(full_roman, mode="friendly")
    simple_english = clean_phonetic_english(full_roman, mode="simple")

    return {
        "translated": full_translated,
        "roman_raw": full_roman,
        "friendly": friendly_english,
        "simple": simple_english
    }


def _translate_with_google_web_fallback(text: str, source_code: str, target_code: str) -> str:
    """Secondary fallback using Google Web Mobile interface."""
    url = "https://translate.google.com/m"
    params = {"sl": source_code, "tl": target_code, "q": text}
    resp = session.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 200:
        match = re.search(r'<div[^>]*class=["\']result-container["\'][^>]*>(.*?)</div>', resp.text, re.DOTALL)
        if match:
            clean = html.unescape(match.group(1)).strip()
            clean = re.sub(r'<[^>]+>', '', clean).strip()
            if clean:
                return clean
    raise RuntimeError("Google Web fallback failed")


def translate_single_chunk(text: str, source_code: str, target_code: str) -> Dict[str, str]:
    """
    Translates a single paragraph or sentence chunk and retrieves transliteration.
    """
    clean_text = text.strip()
    if not clean_text:
        return {"translated": "", "roman_raw": "", "friendly": "", "simple": ""}

    if source_code == target_code:
        # Same language, but if source is Indic and target is requested, we can still transliterate!
        if source_code in SUPPORTED_LANGUAGES and SUPPORTED_LANGUAGES[source_code]["has_transliteration"]:
            try:
                # Transliterate directly
                url = "https://clients5.google.com/translate_a/single"
                params = [("client", "dict-chrome-ex"), ("sl", source_code), ("tl", "en"), ("dt", "t"), ("dt", "rm"), ("q", clean_text)]
                r = session.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT).json()
                roman = ""
                if r and len(r) > 0 and len(r[0]) > 1 and len(r[0][1]) > 3:
                    roman = r[0][1][3] or ""
                if not roman and len(r[0]) > 0 and len(r[0][0]) > 2:
                    roman = r[0][0][2] or ""
                friendly = clean_phonetic_english(roman, "friendly")
                simple = clean_phonetic_english(roman, "simple")
                return {"translated": clean_text, "roman_raw": roman, "friendly": friendly, "simple": simple}
            except Exception:
                pass
        return {"translated": clean_text, "roman_raw": clean_text, "friendly": clean_text, "simple": clean_text}

    # 1. Primary Engine: Google Translate with Romanization
    try:
        return _translate_and_romanize_google(clean_text, source_code, target_code)
    except Exception as e:
        logger.warning(f"Google romanized translation failed for {target_code}, trying fallback: {e}")

    # 2. Secondary Engine: Google Web Fallback
    try:
        fallback_trans = _translate_with_google_web_fallback(clean_text, source_code, target_code)
        return {
            "translated": fallback_trans,
            "roman_raw": fallback_trans,
            "friendly": fallback_trans,
            "simple": fallback_trans
        }
    except Exception as e2:
        logger.error(f"Fallback translation failed: {e2}")

    raise RuntimeError(f"Unable to translate from {source_code} to {target_code}.")


def translate_text_for_language(text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
    """
    Translates full text while preserving paragraph breaks, returning translated text
    and English alphabet transliteration.
    """
    source_code = normalize_lang_code(source_lang)
    target_code = normalize_lang_code(target_lang)

    raw_paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not raw_paragraphs:
        return {
            "success": False,
            "error": "No text content detected for translation."
        }

    translated_paragraphs = []
    roman_raw_paragraphs = []
    friendly_paragraphs = []
    simple_paragraphs = []

    for para in raw_paragraphs:
        res = translate_single_chunk(para, source_code, target_code)
        translated_paragraphs.append(res["translated"])
        roman_raw_paragraphs.append(res["roman_raw"])
        friendly_paragraphs.append(res["friendly"])
        simple_paragraphs.append(res["simple"])

    final_translated = "\n\n".join(translated_paragraphs)
    final_roman_raw = "\n\n".join(roman_raw_paragraphs)
    final_friendly = "\n\n".join(friendly_paragraphs)
    final_simple = "\n\n".join(simple_paragraphs)

    target_info = SUPPORTED_LANGUAGES.get(target_code, {"name": target_code, "native": target_code, "has_transliteration": False})

    return {
        "success": True,
        "target_code": target_code,
        "target_name": target_info.get("name", target_code),
        "target_native": target_info.get("native", target_code),
        "speech_code": target_info.get("speech_code", f"{target_code}-IN"),
        "has_transliteration": target_info.get("has_transliteration", False),
        "translated_text": final_translated,
        "transliterated_friendly": final_friendly,
        "transliterated_simple": final_simple,
        "transliterated_raw": final_roman_raw,
        "paragraphs": translated_paragraphs,
        "paragraphs_transliterated": friendly_paragraphs
    }


def translate_multilingual(text: str, source_lang: str, target_langs: Union[str, List[str]]) -> Dict[str, Any]:
    """
    Translates input text to one or multiple target languages simultaneously.
    Example target_langs: ["kn", "te", "hi"]
    """
    if not text or not text.strip():
        return {
            "success": False,
            "error": "No text provided for translation."
        }

    source_code = normalize_lang_code(source_lang)

    # Normalize targets
    targets: List[str] = []
    if isinstance(target_langs, str):
        # Could be comma-separated or single
        targets = [normalize_lang_code(t.strip()) for t in target_langs.split(",") if t.strip()]
    elif isinstance(target_langs, list):
        targets = [normalize_lang_code(t) for t in target_langs if t]

    # Deduplicate while preserving order
    unique_targets = []
    for t in targets:
        if t in SUPPORTED_LANGUAGES and t not in unique_targets:
            unique_targets.append(t)

    if not unique_targets:
        unique_targets = ["kn"]  # Default to Kannada

    results = {}
    errors = {}

    for idx, target_code in enumerate(unique_targets):
        try:
            # Small delay between consecutive calls to avoid rate limiting
            if idx > 0:
                time.sleep(0.12)
            lang_res = translate_text_for_language(text, source_code, target_code)
            results[target_code] = lang_res
        except Exception as e:
            logger.error(f"Translation failed for {target_code}: {e}")
            errors[target_code] = str(e)

    if not results and errors:
        return {
            "success": False,
            "error": f"Translation failed for all selected languages: {list(errors.values())[0]}"
        }

    source_info = SUPPORTED_LANGUAGES.get(source_code, {"name": source_code, "native": source_code})

    return {
        "success": True,
        "original_text": text.strip(),
        "source_lang": source_code,
        "source_name": source_info.get("name", source_code),
        "source_native": source_info.get("native", source_code),
        "target_languages": list(results.keys()),
        "translations": results,
        "errors": errors if errors else None
    }


def transliterate_text(text: str, lang: str, mode: str = "friendly") -> Dict[str, Any]:
    """
    Dedicated endpoint to convert native Indian script into readable English alphabet letters.
    E.g. text="ನಾನು", lang="kn" -> "naanu" / "nanu".
    """
    clean_text = text.strip()
    if not clean_text:
        return {"success": False, "error": "Empty text provided for transliteration."}

    lang_code = normalize_lang_code(lang)

    try:
        # Use Google Translate transliteration endpoint
        url = "https://clients5.google.com/translate_a/single"
        params = [
            ("client", "dict-chrome-ex"),
            ("sl", lang_code),
            ("tl", "en"),
            ("dt", "t"),
            ("dt", "rm"),
            ("q", clean_text)
        ]
        r = session.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT).json()

        roman = ""
        if r and len(r) > 0:
            if len(r[0]) > 1 and len(r[0][1]) > 3 and r[0][1][3]:
                roman = r[0][1][3]
            elif len(r[0]) > 0 and len(r[0][0]) > 2 and r[0][0][2]:
                roman = r[0][0][2]

        if not roman:
            # Try reverse romanization
            roman = clean_text

        friendly = clean_phonetic_english(roman, mode="friendly")
        simple = clean_phonetic_english(roman, mode="simple")

        return {
            "success": True,
            "original_text": clean_text,
            "lang": lang_code,
            "roman_raw": roman,
            "transliterated_friendly": friendly,
            "transliterated_simple": simple,
            "result": friendly if mode == "friendly" else simple
        }

    except Exception as e:
        logger.error(f"Transliteration failed: {e}")
        return {
            "success": False,
            "error": f"Transliteration error: {str(e)}"
        }


# Maintain backward compatibility with previous translate_text call
def translate_text(text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
    """Backward compatible wrapper returning single-language translation object."""
    res = translate_multilingual(text, source_lang, [target_lang])
    if not res.get("success"):
        return res

    target_code = normalize_lang_code(target_lang)
    single = res["translations"].get(target_code, {})

    return {
        "success": True,
        "original_text": text.strip(),
        "translated_text": single.get("translated_text", ""),
        "transliterated_text": single.get("transliterated_friendly", ""),
        "transliterated_friendly": single.get("transliterated_friendly", ""),
        "transliterated_simple": single.get("transliterated_simple", ""),
        "transliterated_raw": single.get("transliterated_raw", ""),
        "paragraphs": single.get("paragraphs", []),
        "source_lang": res.get("source_lang"),
        "target_lang": target_code,
        "source_name": res.get("source_name"),
        "target_name": single.get("target_name"),
    }
