"""
DHVANI
“A Real-Time Multilingual Speech Recognition and Paragraph Translation System”
Backend Server - Flask Application
"""

import os
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Import translation service
from services.translator import (
    translate_text,
    get_supported_languages,
    SUPPORTED_LANGUAGES,
    normalize_lang_code,
)

# Initialize Flask application
app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static"
)

# Application configurations
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dhvani-secret-key-2026")
app.config["JSON_AS_ASCII"] = False  # Ensure unicode characters (Kannada, Hindi, etc.) are not escaped

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logger = logging.getLogger("dhvani.app")


@app.route("/")
def index():
    """Render main application homepage."""
    languages = get_supported_languages()
    return render_template("index.html", languages=languages)


@app.route("/api/languages", methods=["GET"])
def api_languages():
    """
    Returns list of all supported languages along with
    their speech recognition codes and native display titles.
    """
    return jsonify({
        "success": True,
        "languages": get_supported_languages()
    })


@app.route("/api/translate", methods=["POST"])
def api_translate():
    """
    REST API endpoint for paragraph translation.
    Expects JSON payload:
    {
        "source_lang": "en",
        "target_lang": "kn",
        "text": "Today I went to the market. I bought some vegetables."
    }
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid request. JSON body is required."
            }), 400

        text = data.get("text", "")
        source_lang = data.get("source_lang", "").strip()
        target_lang = data.get("target_lang", "").strip()

        # Validation checks
        if not text or not text.strip():
            return jsonify({
                "success": False,
                "error": "No text provided. Please speak or provide text to translate."
            }), 400

        if not source_lang:
            return jsonify({
                "success": False,
                "error": "Source language must be specified."
            }), 400

        if not target_lang:
            return jsonify({
                "success": False,
                "error": "Target language must be specified."
            }), 400

        # Perform translation via translation service
        result = translate_text(text, source_lang, target_lang)

        if not result.get("success"):
            return jsonify({
                "success": False,
                "error": result.get("error", "Translation failed. Please try again.")
            }), 500

        return jsonify(result), 200

    except Exception as e:
        logger.exception("Unexpected error in /api/translate")
        return jsonify({
            "success": False,
            "error": f"An unexpected server error occurred: {str(e)}"
        }), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint to verify backend service readiness."""
    return jsonify({
        "status": "healthy",
        "service": "Dhvani Translation Backend",
        "supported_languages_count": len(SUPPORTED_LANGUAGES)
    })


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    print("=" * 68)
    print("  DHVANI - Multilingual Speech Recognition & Translation System")
    print(f"  👉 Open in Google Chrome / Edge: http://localhost:{port}")
    print(f"  (Using 'localhost' is required for Web Speech API microphone access)")
    print("=" * 68)

    app.run(host=host, port=port, debug=debug)
