# DHVANI 🎙️🎬🌐
### *A Real-Time Multilingual Speech Recognition, Video Transcription, and Multi-Target Translation & Transliteration Platform*

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-lightgrey.svg)](https://flask.palletsprojects.com/)
[![Web Speech API](https://img.shields.io/badge/Web%20Speech%20API-W3C%20Standard-green.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
[![Embedded FFmpeg](https://img.shields.io/badge/FFmpeg-Embedded%20Binary-red.svg)](https://ffmpeg.org/)
[![Translation](https://img.shields.io/badge/Google%20NMT-Neural%20Translation-orange.svg)](https://cloud.google.com/translate)
[![Transliteration](https://img.shields.io/badge/Phonetic%20Transliteration-English%20Alphabet-purple.svg)](#-english-alphabet-transliteration-kanglish-hinglish-tenglish)

---

## 📌 Overview

**DHVANI** is an intelligent, multi-modal speech recognition, video dialogue extraction, translation, and transliteration platform. 

Whether you:
1. **Speak live** into the microphone in real time,
2. **Upload any video or audio file** (MP4, WebM, MKV, MOV, MP3, WAV, M4A), or
3. **Paste any YouTube link or Shorts URL**,

DHVANI automatically extracts the spoken dialogue, organizes continuous speech into structured **paragraphs**, and translates into **multiple preferred languages simultaneously** (such as Kannada, Telugu, and Hindi at once). 

Crucially, DHVANI also provides **English Alphabet Phonetic Transliteration** (Romanization):
> *For example, an English video translated into Kannada can be read in both authentic script (`"ನಾನು ಇಂದು ಮನೆಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ"`) and fluent, natural English letters (`"naanu indu manege hoguttiddene"`).*

Built with pure **HTML5, custom CSS3, and vanilla JavaScript** (zero dependency on Bootstrap, Tailwind, or React) and powered by a high-performance **Python Flask + embedded FFmpeg** backend.

---

## ✨ Key Features

### 1. 🎙️ Tri-Modal Speech & Video Input
- **Live Microphone**: Web Speech API real-time speech recognition with live audio visualizer and pause/paragraph detection.
- **Video & Audio File Upload**: Upload local MP4, WebM, MKV, MOV, MP3, or WAV files (up to 150MB). Embedded FFmpeg converts the audio stream to 16kHz mono WAV and transcribes dialogue with timestamp cues. Includes built-in video preview player!
- **YouTube Link Transcriber**: Paste any YouTube video URL or Shorts link (`https://youtube.com/watch?v=...`, `youtu.be/...`). DHVANI instantly fetches the transcript and translates it directly.

### 2. ⚡ Multi-Target Simultaneous Translation
- Select **multiple languages at once** (e.g., **Kannada + Telugu + Hindi**)!
- Quick 1-click presets:
  - ⚡ *Kannada + Telugu + Hindi*
  - 🌴 *All South Indian (Kannada, Telugu, Tamil, Malayalam)*
  - 🇮🇳 *All Indian Languages*
- Displays parallel language tabs (`[Kannada]` `[Telugu]` `[Hindi]`) and a synchronized **All Languages Combined Grid View**!

### 3. 🔤 English Alphabet Transliteration (Kanglish, Hinglish, Tenglish)
- Automatically converts Indian language scripts into readable English letters:
  - **Kannada**: `ನಾನು` &rarr; `naanu` / `nanu`
  - **Hindi**: `नमस्ते` &rarr; `namaste`
  - **Telugu**: `నేను` &rarr; `nenu`
  - **Tamil**: `வணக்கம்` &rarr; `vanakkam`
- Segmented view toggles:
  - 🔤 **English Letters** (Kanglish / Hinglish / Tenglish)
  - ✍️ **Native Script** (ಕನ್ನಡ / हिन्दी / తెలుగు)
  - 🪟 **Both (Dual View Side-by-Side)**
- Spelling style selector: **Friendly (`naanu`)** vs. **Simple (`nanu`)**.

### 4. 📥 Subtitle (.SRT) & Document (.TXT) Export
- Export timestamped Subtitle files (`.SRT`) for original dialogue and any translated language.
- Export formatted bilingual documentation reports (`.TXT`).

### 5. 🎨 Subtle Lavender Glow UI Design
- Designed to high aesthetic standards with the requested subtle lavender soft glow palette (`#9B8AC4`, `#C8B6E8`, `#B39DDB`, `#3D3155`, `#F7F5FB`).
- Completely border-free, diffuse multi-tier glow without harsh outlines.

---

## 🗣️ Supported Languages

| Language | ISO Code | Speech Tag | Native Name | Transliteration Dialect |
| :--- | :---: | :---: | :--- | :--- |
| **Kannada** | `kn` | `kn-IN` | ಕನ್ನಡ | **Kanglish** (e.g., *naanu, manege*) |
| **Telugu** | `te` | `te-IN` | తెలుగు | **Tenglish** (e.g., *nenu, intiki*) |
| **Hindi** | `hi` | `hi-IN` | हिन्दी | **Hinglish** (e.g., *namaskar, swagat*) |
| **Tamil** | `ta` | `ta-IN` | தமிழ் | **Tanglish** (e.g., *vanakkam, varuga*) |
| **Malayalam** | `ml` | `ml-IN` | മലയാളം | **Manglish** (e.g., *namaskaram*) |
| **Marathi** | `mr` | `mr-IN` | मराठी | **Marathi in English** |
| **Bengali** | `bn` | `bn-IN` | বাংলা | **Banglish** |
| **Gujarati** | `gu` | `gu-IN` | ગુજરાતી | **Gujarati in English** |
| **English** | `en` | `en-US` | English | Standard Latin |
| **Spanish** | `es` | `es-ES` | Español | Standard Latin |

---

## 🏗️ System Architecture

```
                      ┌────────────────────────────────────────┐
                      │            INPUT MODES                 │
                      ├──────────────┬─────────────┬───────────┤
                      │ 🎙️ Live Mic  │ 🎬 Video    │ 📺 YouTube│
                      │ (Web Speech) │ (Local MP4) │ (Link API)│
                      └──────┬───────┴──────┬──────┴─────┬─────┘
                             │              │            │
                             ▼              ▼            ▼
                    ┌──────────────────────────────────────────┐
                    │           AUDIO PRE-PROCESSING           │
                    │   - Embedded FFmpeg (imageio-ffmpeg)     │
                    │   - 16kHz Mono PCM WAV Resampling        │
                    │   - Chunking & Silence Detection         │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │        SPEECH RECOGNITION ENGINE         │
                    │   - Google Speech Recognition API        │
                    │   - Paragraph Boundary Organization      │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │        MULTI-TARGET TRANSLATION          │
                    │   - Google Neural Machine Translation    │
                    │   - Simultaneous Multi-Language Loop     │
                    │     (Kannada, Telugu, Hindi, etc.)       │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │    INDIC-TO-ENGLISH TRANSLITERATION      │
                    │   - Romanization Extraction (dt=rm)      │
                    │   - Phonetic Diacritic Normalization     │
                    │   - "Friendly" (naanu) / "Simple" (nanu) │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │         PRESENTATION & EXPORT            │
                    │   - Dual View & Multi-Language Tabs      │
                    │   - Audio Playback (TTS Synthesis)       │
                    │   - Subtitle (.SRT) & Report (.TXT)      │
                    └──────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10 or higher.
- Google Chrome or Microsoft Edge (recommended for Web Speech API).

### 2. Clone and Install Dependencies
```powershell
git clone https://github.com/akshhkotian/Dhvani.git
cd Dhvani
pip install -r requirements.txt
```

### 3. Run the Application
```powershell
python app.py
```
Open your browser and navigate to:
```
👉 http://localhost:5000
```
*(Accessing via `http://localhost:5000` is required for browser microphone permissions).*

---

## 🧪 Testing

Run the automated test suite verifying multi-target translation, YouTube parsing, video audio extraction, and transliteration:
```powershell
python -X utf8 test_app_endpoints.py
```

---

## 👥 Contributors & Credits
- **Project**: DHVANI
- **Author**: Akshatha Kotian
- **Repository**: [https://github.com/akshhkotian/Dhvani](https://github.com/akshhkotian/Dhvani)
