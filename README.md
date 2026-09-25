# DHVANI 🎙️🌐
### *A Real-Time Multilingual Speech Recognition and Paragraph Translation System*

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-lightgrey.svg)](https://flask.palletsprojects.com/)
[![Web Speech API](https://img.shields.io/badge/Web%20Speech%20API-W3C%20Standard-green.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
[![Translation](https://img.shields.io/badge/Google%20NMT-Neural%20Translation-orange.svg)](https://cloud.google.com/translate)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📌 Overview

**DHVANI** is an intelligent, real-time speech processing and natural language translation application. It allows users to speak naturally in their preferred language, transcribes speech into text in real time using the browser's native **Web Speech API**, structures continuous thoughts into formatted, readable **paragraphs**, and translates those paragraphs into any of 10 regional and international languages via a **Python Flask** neural translation backend.

Built using pure **HTML5, custom CSS3, and vanilla JavaScript** on the frontend (zero dependency on Bootstrap, Tailwind, or React) and **Python Flask** on the backend.

---

## ✨ Key Features

1. **🎙️ Real-Time Speech Recognition**:
   - Live transcription powered by the browser's native Web Speech API.
   - Dynamic audio wave visualizer and pulsating mic indicators.
   - Adaptive chunked HTTPS mode to prevent WebSocket network drops.
   - Pre-flight microphone permission checks via `navigator.mediaDevices`.

2. **📑 Intelligent Paragraph Formation**:
   - Automatically groups continuous speech into distinct paragraphs instead of run-on walls of text.
   - Silence and pause detection (`2.2-second` speech boundaries).
   - Sentence termination punctuation detection (`.`, `?`, `!`, `।`).
   - Dual-view switcher: Formatted Paragraphs view (`¶ 1`, `¶ 2`) vs. Raw Plaintext view.

3. **🌐 High-Accuracy Neural Translation**:
   - Powered by Google's **Neural Machine Translation (NMT)** deep learning engine.
   - Preserves 1-to-1 paragraph boundaries between source and target outputs.
   - Fluent, grammatically accurate translations for Indian and international languages.

4. **⇄ One-Click Language Swapping**:
   - Instantly swaps Input Language and Target Language.
   - Automatically updates speech recognition dialect codes on the fly.

5. **📋 Clipboard & Accessibility**:
   - One-click copying for both original speech and translated paragraphs.
   - Built-in Text-to-Speech (TTS) speaker to read translated paragraphs aloud.
   - Native Windows Voice Typing (<kbd>Win</kbd> + <kbd>H</kbd>) support for desktop dictation.

6. **✨ Live Speech Simulation (Project Demo Mode)**:
   - Includes a **`[✨ Test Sample Speech]`** button to simulate speaking and paragraph structuring during presentations, even on offline or firewall-restricted Wi-Fi.

---

## 🗣️ Supported Languages

| Language | ISO Code | Speech Recognition Tag | Native Name |
| :--- | :---: | :---: | :--- |
| **English** | `en` | `en-US` / `en-IN` | English |
| **Kannada** | `kn` | `kn-IN` | ಕನ್ನಡ |
| **Hindi** | `hi` | `hi-IN` | हिन्दी |
| **Tamil** | `ta` | `ta-IN` | தமிழ் |
| **Telugu** | `te` | `te-IN` | తెలుగు |
| **Malayalam** | `ml` | `ml-IN` | മലയാളം |
| **Marathi** | `mr` | `mr-IN` | मराठी |
| **Bengali** | `bn` | `bn-IN` | বাংলা |
| **Gujarati** | `gu` | `gu-IN` | ગુજરાતી |
| **Spanish** | `es` | `es-ES` | Español |

---

## 🏗️ System Architecture

```
User Voice Input
       │
       ▼
[ Browser Microphone ]
       │ (W3C Web Speech API)
       ▼
[ Real-Time Speech Recognition (script.js) ]
       │
       ▼
[ Paragraph Formation Algorithm ]
   ├─ Pause & Boundary Detection
   └─ Punctuation Normalization
       │
       ▼
[ AJAX POST /api/translate ]
       │
       ▼
[ Flask Backend (app.py) ]
       │
       ▼
[ Translation Service (services/translator.py) ]
       │ (Google NMT Engine)
       ▼
[ Multilingual Paragraph Output ]
       │
       ▼
[ Display / Copy / Text-to-Speech ]
```

---

## 📁 Project Structure

```
Dhvani/
│
├── app.py                      # Flask REST API backend & routes
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment configuration
├── .gitignore                  # Git ignore rules
├── test_translation.py         # Standalone test script for translation engine
├── README.md                   # Project documentation
│
├── templates/
│   └── index.html              # Responsive frontend UI
│
├── static/
│   ├── css/
│   │   └── style.css           # Bespoke pure CSS styling (no frameworks)
│   │
│   └── js/
│       └── script.js           # Speech recognition, paragraphing & translation logic
│
└── services/
    └── translator.py           # Google Neural Translation service
```

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/Dhvani.git
cd Dhvani
```

### 2. Create and Activate Virtual Environment (Optional but Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
Copy `.env.example` to `.env`:
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

---

## 💻 Running the Application

Start the Flask server:
```bash
python app.py
```

Open your browser and navigate to:
👉 **`http://localhost:5000`**

> [!IMPORTANT]
> Always access the application via **`http://localhost:5000`** instead of raw IP (`127.0.0.1`). Google Chrome enforces a secure context rule for Web Speech API audio streaming that requires `localhost`.

---

## 🧪 Testing the Translation Engine

You can test the backend translation service directly from the command line without opening a browser:

```bash
python test_translation.py
```

Expected output:
```
=================================================================
  DHVANI - GOOGLE NEURAL TRANSLATION VERIFICATION
=================================================================
[Kannada - ಕನ್ನಡ (kn)]:
ಇಂದು ನಾನು ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗಿದ್ದೆ.
ನಾನು ಕೆಲವು ತಾಜಾ ತರಕಾರಿಗಳನ್ನು ಖರೀದಿಸಿದೆ.
ನಂತರ ನಾನು ಮನೆಗೆ ಬಂದು ಮಧ್ಯಾಹ್ನದ ಅಡುಗೆ ಮಾಡಿದೆ.
...
```

---

## 🛠️ Troubleshooting Speech Recognition

If you encounter:
`"Network error encountered during speech recognition"`:
1. **Check URL**: Use `http://localhost:5000` (not `127.0.0.1:5000`).
2. **Browser**: Use **Google Chrome** or **Microsoft Edge**. (Brave browser disables Google speech by default; Firefox lacks Web Speech API speech-to-text support).
3. **Windows Microphone Permissions**:
   - Go to Windows *Settings > Privacy & Security > Microphone*.
   - Make sure **"Let desktop apps access your microphone"** is **ON**.
4. **VPN / College Wi-Fi**: If campus Wi-Fi blocks WebSockets, test with a mobile hotspot or use the **`[✨ Test Sample Speech]`** button.

---

## 📜 License

This project is licensed under the MIT License — feel free to use and adapt for academic and educational demonstrations.
