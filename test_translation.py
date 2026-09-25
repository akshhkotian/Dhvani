"""
Dhvani - Translation Verification Script
Verifies Google Neural Machine Translation across languages.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from services.translator import translate_text, SUPPORTED_LANGUAGES

def main():
    print("=" * 65)
    print("  DHVANI - GOOGLE NEURAL TRANSLATION VERIFICATION")
    print("=" * 65)

    sample_paragraph = (
        "Today I went to the market.\n\n"
        "I bought some fresh vegetables.\n\n"
        "Then I came back home and cooked lunch."
    )

    print(f"Sample Input (English):\n{sample_paragraph}\n")
    print("-" * 65)

    test_languages = ["kn", "hi", "ta", "te", "mr", "es"]

    for code in test_languages:
        info = SUPPORTED_LANGUAGES[code]
        res = translate_text(sample_paragraph, "en", code)
        if res.get("success"):
            print(f"[{info['name']} - {info['native']} ({code})]:")
            print(res["translated_text"])
            print()
        else:
            print(f"[{info['name']}]: FAILED -> {res.get('error')}\n")
        print("-" * 65)

if __name__ == "__main__":
    main()
