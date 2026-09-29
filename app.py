"""
DHVANI
“A Real-Time Multilingual Speech Recognition, Video Transcription,
and Multi-Language Paragraph Translation & Transliteration Platform”

Backend Server - Flask Application
"""

import os
import json
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Import translation & transliteration service
from services.translator import (
    translate_multilingual,
    transliterate_text,
    get_supported_languages,
    SUPPORTED_LANGUAGES,
    normalize_lang_code,
)

# Import video and audio processing service
from services.video_service import (
    process_youtube_url,
    process_uploaded_video_file,
    extract_youtube_video_id
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
app.config["JSON_AS_ASCII"] = False  # Ensure unicode characters (Kannada, Hindi, etc.) are preserved
app.config["MAX_CONTENT_LENGTH"] = 150 * 1024 * 1024  # Max upload size 150MB

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
    their speech recognition codes, native names, and transliteration flags.
    """
    return jsonify({
        "success": True,
        "languages": get_supported_languages()
    })


@app.route("/api/translate", methods=["POST"])
def api_translate():
    """
    REST API endpoint for multilingual paragraph translation & transliteration.
    Supports either single 'target_lang' or multiple 'target_langs' (e.g. ['kn', 'te', 'hi']).
    
    Payload:
    {
        "text": "Hello, I am going home.",
        "source_lang": "en",
        "target_langs": ["kn", "te", "hi"]
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
        source_lang = data.get("source_lang", "en").strip()
        
        # Support both 'target_langs' (list/str) and backward-compatible 'target_lang' (str)
        target_langs = data.get("target_langs")
        if not target_langs:
            target_langs = data.get("target_lang")

        if not text or not text.strip():
            return jsonify({
                "success": False,
                "error": "No text provided. Please speak or provide text to translate."
            }), 400

        if not target_langs:
            return jsonify({
                "success": False,
                "error": "At least one target language must be specified."
            }), 400

        result = translate_multilingual(text, source_lang, target_langs)
        if not result.get("success"):
            return jsonify(result), 500

        return jsonify(result), 200

    except Exception as e:
        logger.exception("Unexpected error in /api/translate")
        return jsonify({
            "success": False,
            "error": f"An unexpected server error occurred: {str(e)}"
        }), 500


@app.route("/api/transliterate", methods=["POST"])
def api_transliterate():
    """
    Dedicated endpoint to convert native Indian scripts (Kannada, Hindi, etc.)
    into readable English letters (e.g. "ನಾನು" -> "naanu" / "nanu").
    """
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        lang = data.get("lang", "kn").strip()
        style = data.get("style", "friendly").strip()

        if not text:
            return jsonify({
                "success": False,
                "error": "No text provided for transliteration."
            }), 400

        result = transliterate_text(text, lang, style)
        return jsonify(result), 200 if result.get("success") else 400

    except Exception as e:
        logger.exception("Unexpected error in /api/transliterate")
        return jsonify({
            "success": False,
            "error": f"Transliteration error: {str(e)}"
        }), 500


@app.route("/api/process_youtube", methods=["POST"])
def api_process_youtube():
    """
    Extracts speech dialogue from a YouTube URL (using transcripts or audio extraction).
    Optionally translates directly into multiple preferred languages if 'target_langs' is provided.
    
    Payload:
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID",
        "source_lang": "auto",
        "target_langs": ["kn", "te", "hi"]  // Optional
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        url = data.get("url", "").strip()
        source_lang = data.get("source_lang", "auto").strip()
        target_langs = data.get("target_langs")

        if not url:
            return jsonify({
                "success": False,
                "error": "Please provide a valid YouTube video URL."
            }), 400

        # Process YouTube video to extract speech/transcript
        yt_result = process_youtube_url(url, preferred_source_lang=source_lang)
        if not yt_result.get("success"):
            return jsonify(yt_result), 400

        full_text = yt_result.get("full_text", "")
        detected_lang = yt_result.get("detected_lang", "en")

        # If user also requested target translation languages, translate immediately!
        translations_data = None
        if target_langs and full_text.strip():
            src = source_lang if source_lang != "auto" else detected_lang
            trans_res = translate_multilingual(full_text, src, target_langs)
            if trans_res.get("success"):
                translations_data = trans_res

        response_payload = {
            "success": True,
            "source_type": "youtube",
            "video_id": yt_result.get("video_id"),
            "embed_url": yt_result.get("embed_url"),
            "detected_lang": detected_lang,
            "language_name": yt_result.get("language_name", detected_lang),
            "transcript_text": full_text,
            "paragraphs": yt_result.get("paragraphs", []),
            "translations": translations_data
        }
        return jsonify(response_payload), 200

    except Exception as e:
        logger.exception("Unexpected error in /api/process_youtube")
        return jsonify({
            "success": False,
            "error": f"Failed to process YouTube link: {str(e)}"
        }), 500


@app.route("/api/transcribe_file", methods=["POST"])
def api_transcribe_file():
    """
    Accepts uploaded video/audio file (MP4, WebM, MKV, MOV, MP3, WAV, etc.),
    extracts dialogue using embedded FFmpeg and Google Speech Recognition,
    and optionally translates into multiple target languages.
    """
    try:
        if "file" not in request.files:
            return jsonify({
                "success": False,
                "error": "No file uploaded. Please select a video or audio file."
            }), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({
                "success": False,
                "error": "No file selected."
            }), 400

        source_lang = request.form.get("source_lang", "en").strip()
        target_langs_raw = request.form.get("target_langs")

        target_langs = None
        if target_langs_raw:
            try:
                target_langs = json.loads(target_langs_raw)
            except Exception:
                target_langs = [t.strip() for t in target_langs_raw.split(",") if t.strip()]

        # Process uploaded video/audio file
        media_result = process_uploaded_video_file(file, source_lang=source_lang)
        if not media_result.get("success"):
            return jsonify(media_result), 400

        transcribed_text = media_result.get("full_text", "")

        # Perform translation if target languages specified
        translations_data = None
        if target_langs and transcribed_text.strip():
            trans_res = translate_multilingual(transcribed_text, source_lang, target_langs)
            if trans_res.get("success"):
                translations_data = trans_res

        response_payload = {
            "success": True,
            "source_type": "uploaded_media",
            "filename": media_result.get("original_filename"),
            "file_size_mb": media_result.get("file_size_mb"),
            "duration_formatted": media_result.get("duration_formatted"),
            "source_lang": source_lang,
            "transcribed_text": transcribed_text,
            "paragraphs": media_result.get("paragraphs", []),
            "translations": translations_data
        }
        return jsonify(response_payload), 200

    except Exception as e:
        logger.exception("Unexpected error in /api/transcribe_file")
        return jsonify({
            "success": False,
            "error": f"Failed to process media file: {str(e)}"
        }), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint to verify backend service readiness."""
    return jsonify({
        "status": "healthy",
        "service": "Dhvani Video Transcription & Multilingual Translation Backend",
        "supported_languages_count": len(SUPPORTED_LANGUAGES),
        "features": [
            "Real-Time Web Speech Recognition",
            "Video & Audio File Transcription (Embedded FFmpeg)",
            "YouTube URL Speech/Subtitle Extraction",
            "Simultaneous Multi-Language Translation",
            "Indic-to-English Phonetic Transliteration (Kanglish, Hinglish, Tenglish, etc.)"
        ]
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
