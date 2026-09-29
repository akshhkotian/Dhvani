"""
Dhvani - Video & Audio Processing Service
==========================================
Handles:
1. YouTube link transcript extraction (via YouTubeTranscriptApi with yt-dlp fallback)
2. Local video/audio file extraction and transcription (via imageio-ffmpeg + SpeechRecognition)
3. Sentence-to-paragraph organizing with timestamp cues
"""

import os
import re
import tempfile
import logging
import subprocess
from typing import Dict, Any, List, Optional
import imageio_ffmpeg
import speech_recognition as sr
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp

logger = logging.getLogger("dhvani.video_service")
logging.basicConfig(level=logging.INFO)

# Recognizer instance for audio processing
recognizer = sr.Recognizer()


def extract_youtube_video_id(url: str) -> Optional[str]:
    """
    Extracts the 11-character YouTube video ID from various link structures:
      - https://www.youtube.com/watch?v=VIDEO_ID
      - https://youtu.be/VIDEO_ID
      - https://www.youtube.com/shorts/VIDEO_ID
      - https://www.youtube.com/embed/VIDEO_ID
      - https://m.youtube.com/watch?v=VIDEO_ID
    """
    if not url:
        return None
    url = url.strip()

    # Direct 11-character alphanumeric ID
    if len(url) == 11 and re.match(r'^[0-9A-Za-z_-]{11}$', url):
        return url

    patterns = [
        r'(?:v=|\/|embed\/|shorts\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'youtube\.com\/watch\?.*v=([0-9A-Za-z_-]{11})'
    ]

    for pat in patterns:
        match = re.search(pat, url)
        if match:
            return match.group(1)

    return None


def format_seconds_to_timestamp(seconds: float) -> str:
    """Format float seconds to MM:SS or HH:MM:SS."""
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def group_snippets_into_paragraphs(snippets: List[Dict[str, Any]], target_word_count: int = 45) -> List[Dict[str, Any]]:
    """
    Groups short subtitle snippets into cohesive paragraphs with start/end timestamps.
    """
    if not snippets:
        return []

    paragraphs = []
    current_text_parts = []
    current_start = snippets[0].get("start", 0.0)
    current_words = 0

    for item in snippets:
        text = item.get("text", "").strip()
        if not text:
            continue

        # Clean noise tags like [Music], (Applause), [Laughter]
        cleaned_text = re.sub(r'\[.*?\]|\(.*?\)', '', text).strip()
        if not cleaned_text:
            continue

        words = cleaned_text.split()
        current_text_parts.append(cleaned_text)
        current_words += len(words)

        # Check if we reached sentence end or sufficient length
        ends_with_terminal = cleaned_text.endswith((".", "?", "!"))
        if current_words >= target_word_count or (current_words >= 25 and ends_with_terminal):
            para_text = " ".join(current_text_parts).strip()
            # Capitalize first letter
            if para_text:
                para_text = para_text[0].upper() + para_text[1:]
            paragraphs.append({
                "start": current_start,
                "end": item.get("start", 0.0) + item.get("duration", 0.0),
                "timestamp": format_seconds_to_timestamp(current_start),
                "text": para_text
            })
            current_text_parts = []
            current_words = 0
            current_start = item.get("start", 0.0) + item.get("duration", 0.0)

    # Remaining snippet
    if current_text_parts:
        para_text = " ".join(current_text_parts).strip()
        if para_text:
            para_text = para_text[0].upper() + para_text[1:]
            last_item = snippets[-1]
            paragraphs.append({
                "start": current_start,
                "end": last_item.get("start", 0.0) + last_item.get("duration", 0.0),
                "timestamp": format_seconds_to_timestamp(current_start),
                "text": para_text
            })

    return paragraphs


def process_youtube_url(url: str, preferred_source_lang: str = "auto") -> Dict[str, Any]:
    """
    Extracts speech transcript from a YouTube URL.
    Attempts:
      1. YouTubeTranscriptApi (instant official/auto-generated subtitles)
      2. yt-dlp audio download + ffmpeg conversion + SpeechRecognition (fallback)
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return {
            "success": False,
            "error": "Invalid YouTube URL. Please provide a valid YouTube watch or shorts link."
        }

    logger.info(f"Processing YouTube video: {video_id}")
    embed_url = f"https://www.youtube.com/embed/{video_id}"

    # 1. Try YouTubeTranscriptApi
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        # Priority language codes
        lang_priorities = []
        if preferred_source_lang and preferred_source_lang != "auto":
            lang_priorities.append(preferred_source_lang)
        lang_priorities.extend(["en", "en-US", "en-GB", "hi", "kn", "ta", "te", "es"])

        chosen_transcript = None

        # Look for priority languages
        try:
            chosen_transcript = transcript_list.find_transcript(lang_priorities)
        except Exception:
            # Fallback to any available transcript (manual or auto-generated)
            for t in transcript_list:
                chosen_transcript = t
                break

        if chosen_transcript:
            fetched_items = chosen_transcript.fetch()
            snippets = []
            for item in fetched_items:
                snippets.append({
                    "text": item.text,
                    "start": item.start,
                    "duration": item.duration
                })

            paragraphs = group_snippets_into_paragraphs(snippets)
            full_text = "\n\n".join([p["text"] for p in paragraphs]) if paragraphs else " ".join([s["text"] for s in snippets])

            return {
                "success": True,
                "video_id": video_id,
                "embed_url": embed_url,
                "source_type": "youtube_transcript",
                "detected_lang": chosen_transcript.language_code,
                "language_name": chosen_transcript.language,
                "is_auto_generated": chosen_transcript.is_generated,
                "full_text": full_text.strip(),
                "paragraphs": paragraphs
            }

    except Exception as e:
        logger.warning(f"YouTube transcript API could not find direct subtitles for {video_id}: {e}. Trying audio fallback.")

    # 2. Fallback: yt-dlp audio download + ffmpeg + SpeechRecognition
    try:
        return _transcribe_youtube_audio_fallback(video_id, preferred_source_lang)
    except Exception as e:
        logger.error(f"Fallback audio transcription failed for YouTube {video_id}: {e}")
        return {
            "success": False,
            "error": f"Could not extract speech from YouTube video: {str(e)}"
        }


def _transcribe_youtube_audio_fallback(video_id: str, preferred_source_lang: str = "en") -> Dict[str, Any]:
    """Fallback method downloading audio snippet with yt-dlp and transcribing with SpeechRecognition."""
    temp_dir = tempfile.mkdtemp(prefix="dhvani_yt_")
    output_template = os.path.join(temp_dir, "%(id)s.%(ext)s")
    embed_url = f"https://www.youtube.com/embed/{video_id}"

    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'max_filesize': 25 * 1024 * 1024  # Limit to 25MB audio
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
            downloaded_file = ydl.prepare_filename(info)

        # Convert to 16kHz mono WAV using imageio-ffmpeg
        wav_path = os.path.join(temp_dir, f"{video_id}_audio.wav")
        convert_media_to_wav(downloaded_file, wav_path)

        # Transcribe WAV
        speech_code = "en-US"
        if preferred_source_lang and preferred_source_lang != "auto":
            # Map simple code to BCP-47
            speech_code = f"{preferred_source_lang}-IN" if preferred_source_lang in ["hi", "kn", "ta", "te", "ml", "mr", "bn", "gu"] else "en-US"

        result = transcribe_wav_file(wav_path, speech_code=speech_code)

        result.update({
            "video_id": video_id,
            "embed_url": embed_url,
            "source_type": "youtube_audio_transcription",
            "detected_lang": preferred_source_lang or "en"
        })
        return result

    finally:
        # Clean up temporary directory
        try:
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for f in files:
                    os.remove(os.path.join(root, f))
                for d in dirs:
                    os.rmdir(os.path.join(root, d))
            os.rmdir(temp_dir)
        except Exception:
            pass


def convert_media_to_wav(input_path: str, output_wav_path: str) -> None:
    """
    Converts any video or audio file to 16kHz mono 16-bit PCM WAV using embedded ffmpeg.
    """
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", input_path,
        "-vn",                   # Strip video track
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ac", "1",              # 1 channel (mono)
        "-ar", "16000",          # 16 kHz sample rate
        output_wav_path
    ]

    process = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True
    )
    if not os.path.exists(output_wav_path) or os.path.getsize(output_wav_path) == 0:
        raise RuntimeError(f"FFmpeg conversion produced empty file: {process.stderr.decode('utf-8', errors='ignore')}")


def transcribe_wav_file(wav_path: str, speech_code: str = "en-US", chunk_duration: int = 25) -> Dict[str, Any]:
    """
    Transcribes a WAV file in segments using Google Speech Recognition to guarantee high accuracy
    and avoid network timeouts on large files.
    """
    r = sr.Recognizer()
    paragraphs = []
    current_sentences = []
    full_text_list = []

    with sr.AudioFile(wav_path) as source:
        total_duration = source.DURATION
        logger.info(f"Audio total duration: {total_duration:.2f}s")
        offset = 0.0

        # Safety cap for local testing/free tier (up to 10 minutes)
        max_duration = min(total_duration, 600.0)

        while offset < max_duration:
            duration_to_read = min(chunk_duration, max_duration - offset)
            if duration_to_read <= 0.5:
                break

            audio_chunk = r.record(source, duration=duration_to_read)
            chunk_start = offset
            offset += duration_to_read

            try:
                chunk_text = r.recognize_google(audio_chunk, language=speech_code)
                if chunk_text and chunk_text.strip():
                    clean_chunk = chunk_text.strip()
                    # Capitalize first letter and ensure ending punctuation
                    formatted_sentence = clean_chunk[0].upper() + clean_chunk[1:]
                    if not formatted_sentence.endswith((".", "?", "!")):
                        formatted_sentence += "."

                    current_sentences.append(formatted_sentence)
                    full_text_list.append(formatted_sentence)

                    # Group 2-3 sentences into a paragraph
                    if len(current_sentences) >= 2:
                        p_text = " ".join(current_sentences)
                        paragraphs.append({
                            "start": chunk_start,
                            "end": offset,
                            "timestamp": format_seconds_to_timestamp(chunk_start),
                            "text": p_text
                        })
                        current_sentences = []

            except sr.UnknownValueError:
                # Silence or non-speech section in audio
                continue
            except sr.RequestError as e:
                logger.warning(f"Google Speech Recognition API error on chunk {offset:.1f}s: {e}")
                continue

        # Remaining sentences
        if current_sentences:
            p_text = " ".join(current_sentences)
            paragraphs.append({
                "start": max(0.0, offset - chunk_duration),
                "end": offset,
                "timestamp": format_seconds_to_timestamp(max(0.0, offset - chunk_duration)),
                "text": p_text
            })

    full_text = "\n\n".join([p["text"] for p in paragraphs]) if paragraphs else " ".join(full_text_list)
    if not full_text.strip():
        full_text = "No clear speech detected in the audio file. Please ensure the audio contains audible dialogue."

    return {
        "success": True,
        "full_text": full_text.strip(),
        "paragraphs": paragraphs,
        "total_duration": total_duration,
        "duration_formatted": format_seconds_to_timestamp(total_duration)
    }


def process_uploaded_video_file(file_storage, source_lang: str = "en") -> Dict[str, Any]:
    """
    Handles uploaded video or audio file:
    1. Saves file to temporary path
    2. Converts audio to 16kHz WAV with imageio-ffmpeg
    3. Transcribes audio chunks using Google Speech Recognition
    4. Groups sentences into structured paragraphs
    """
    temp_dir = tempfile.mkdtemp(prefix="dhvani_upload_")
    original_filename = file_storage.filename or "uploaded_video.mp4"
    safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', original_filename)
    input_path = os.path.join(temp_dir, safe_name)
    wav_path = os.path.join(temp_dir, "extracted_audio.wav")

    try:
        # Save uploaded file
        file_storage.save(input_path)
        file_size_mb = os.path.getsize(input_path) / (1024 * 1024)
        logger.info(f"Saved uploaded media file '{safe_name}' ({file_size_mb:.2f} MB)")

        # Convert to WAV
        convert_media_to_wav(input_path, wav_path)

        # Map language code
        speech_code = "en-US"
        if source_lang == "kn":
            speech_code = "kn-IN"
        elif source_lang == "hi":
            speech_code = "hi-IN"
        elif source_lang == "te":
            speech_code = "te-IN"
        elif source_lang == "ta":
            speech_code = "ta-IN"
        elif source_lang == "ml":
            speech_code = "ml-IN"
        elif source_lang == "mr":
            speech_code = "mr-IN"
        elif source_lang == "bn":
            speech_code = "bn-IN"
        elif source_lang == "gu":
            speech_code = "gu-IN"
        elif source_lang == "es":
            speech_code = "es-ES"

        result = transcribe_wav_file(wav_path, speech_code=speech_code)
        result.update({
            "original_filename": original_filename,
            "file_size_mb": round(file_size_mb, 2),
            "source_type": "uploaded_video_audio"
        })
        return result

    except Exception as e:
        logger.exception("Failed to process uploaded video/audio file")
        return {
            "success": False,
            "error": f"Failed to process video: {str(e)}"
        }

    finally:
        # Cleanup temporary files
        try:
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for f in files:
                    os.remove(os.path.join(root, f))
                for d in dirs:
                    os.rmdir(os.path.join(root, d))
            os.rmdir(temp_dir)
        except Exception:
            pass
