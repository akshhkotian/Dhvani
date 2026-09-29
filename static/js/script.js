/**
 * DHVANI
 * “A Real-Time Multilingual Speech Recognition, Video Transcription,
 * and Multi-Language Paragraph Translation & Transliteration Platform”
 *
 * Pure Vanilla JavaScript Controller (Zero React, Zero External Libraries)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // DOM ELEMENTS - CORE & NAVIGATION
    // -------------------------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link');
    const toastContainer = document.getElementById('toast-container');
    const globalProcessingBanner = document.getElementById('global-processing-banner');
    const processingTitle = document.getElementById('processing-title');
    const processingSubtitle = document.getElementById('processing-subtitle');

    // Mode Switcher Elements
    const modeMicBtn = document.getElementById('mode-mic-btn');
    const modeVideoBtn = document.getElementById('mode-video-btn');
    const modeYoutubeBtn = document.getElementById('mode-youtube-btn');
    const micControlsPane = document.getElementById('mic-controls-pane');
    const videoControlsPane = document.getElementById('video-controls-pane');
    const youtubeControlsPane = document.getElementById('youtube-controls-pane');

    // Language Selection Elements
    const inputLangSelect = document.getElementById('input-language');
    const speechCodeTag = document.getElementById('speech-code-tag');
    const selectedSummaryBadge = document.getElementById('selected-summary-badge');
    const langChipsGrid = document.getElementById('lang-chips-grid');
    const presetKthBtn = document.getElementById('preset-kth-btn');
    const presetSouthBtn = document.getElementById('preset-south-btn');
    const presetAllBtn = document.getElementById('preset-all-btn');
    const presetClearBtn = document.getElementById('preset-clear-btn');

    // Microphone Controls
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const demoSpeechBtn = document.getElementById('demo-speech-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const audioVisualizer = document.getElementById('audio-visualizer');
    const networkTroubleshootBox = document.getElementById('network-troubleshoot-box');
    const closeTroubleshootBtn = document.getElementById('close-troubleshoot-btn');
    const troubleshootRetryBtn = document.getElementById('troubleshoot-retry-btn');

    // Video / Audio Upload Elements
    const uploadDropzone = document.getElementById('upload-dropzone');
    const mediaFileInput = document.getElementById('media-file-input');
    const browseFileBtn = document.getElementById('browse-file-btn');
    const filePreviewCard = document.getElementById('file-preview-card');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const videoPreviewWrapper = document.getElementById('video-preview-wrapper');
    const videoPreviewPlayer = document.getElementById('video-preview-player');
    const processFileBtn = document.getElementById('process-file-btn');
    const sampleVideoBtn = document.getElementById('sample-video-btn');

    // YouTube Elements
    const youtubeUrlInput = document.getElementById('youtube-url-input');
    const pasteYtBtn = document.getElementById('paste-yt-btn');
    const processYtBtn = document.getElementById('process-yt-btn');
    const sampleYtChips = document.querySelectorAll('.sample-yt-chip');
    const ytPreviewContainer = document.getElementById('yt-preview-container');
    const ytEmbedFrame = document.getElementById('yt-embed-frame');

    // Original Speech / Dialogue Output Elements
    const viewParagraphsBtn = document.getElementById('view-paragraphs-btn');
    const viewRawBtn = document.getElementById('view-raw-btn');
    const paragraphsContainer = document.getElementById('paragraphs-container');
    const placeholderSpeech = document.getElementById('placeholder-speech');
    const paragraphList = document.getElementById('paragraph-list');
    const rawContainer = document.getElementById('raw-container');
    const rawSpeechTextarea = document.getElementById('raw-speech-textarea');
    const interimPreview = document.getElementById('interim-preview');
    const interimText = document.getElementById('interim-text');
    const speechStats = document.getElementById('speech-stats');
    const copySpeechBtn = document.getElementById('copy-speech-btn');
    const downloadSpeechSrt = document.getElementById('download-speech-srt');

    // Transliteration Controls Elements
    const scriptEnglishBtn = document.getElementById('script-english-btn');
    const scriptNativeBtn = document.getElementById('script-native-btn');
    const scriptBothBtn = document.getElementById('script-both-btn');
    const styleFriendlyBtn = document.getElementById('style-friendly-btn');
    const styleSimpleBtn = document.getElementById('style-simple-btn');

    // Translation Output Elements
    const translateBtn = document.getElementById('translate-btn');
    const copyTranslationBtn = document.getElementById('copy-translation-btn');
    const speakTranslationBtn = document.getElementById('speak-translation-btn');
    const targetLangTabs = document.getElementById('target-lang-tabs');
    const translationContainer = document.getElementById('translation-container');
    const placeholderTranslation = document.getElementById('placeholder-translation');
    const activeLangPanel = document.getElementById('active-lang-panel');
    const allLangsGridPanel = document.getElementById('all-langs-grid-panel');
    const translationLoading = document.getElementById('translation-loading');
    const translationLoadingText = document.getElementById('translation-loading-text');
    const translationStats = document.getElementById('translation-stats');
    const downloadTransSrt = document.getElementById('download-trans-srt');
    const downloadTransTxt = document.getElementById('download-trans-txt');

    // -------------------------------------------------------------------------
    // APPLICATION STATE
    // -------------------------------------------------------------------------
    let currentMode = 'mic'; // 'mic', 'video', 'youtube'
    let selectedTargetLangs = ['kn', 'te', 'hi']; // Default multi-selection requested by user
    let activeTargetTab = 'kn'; // Active tab in translation view
    let scriptDisplayMode = 'english'; // 'english', 'native', 'both'
    let translitStyle = 'friendly'; // 'friendly', 'simple'

    // Speech / Dialogue Data
    let recognizedParagraphs = []; // Array of { text, timestamp, start, end }
    let currentUploadedFile = null;
    let currentTranslations = {}; // { 'kn': { translated_text, transliterated_friendly, ... }, ... }
    
    // Live Speech Recognition State
    let recognition = null;
    let isListening = false;
    let restartTimeoutId = null;
    let networkRetryCount = 0;
    const MAX_NETWORK_RETRIES = 2;
    let lastSpeechTimestamp = 0;
    const PAUSE_THRESHOLD_MS = 2200;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognition;

    const LANGUAGE_NAMES = {
        'kn': { name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
        'te': { name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
        'hi': { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
        'ta': { name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
        'ml': { name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
        'mr': { name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
        'bn': { name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
        'gu': { name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
        'en': { name: 'English', native: 'English', flag: '🌐' },
        'es': { name: 'Spanish', native: 'Español', flag: '🇪🇸' }
    };

    // -------------------------------------------------------------------------
    // NOTIFICATION TOAST UTILITY
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', title = '') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
        const defaultTitles = { error: 'Notice', success: 'Success', info: 'Information' };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <div class="toast-body">
                <div class="toast-title">${title || defaultTitles[type]}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // -------------------------------------------------------------------------
    // TOP NAVIGATION SMOOTH SCROLLING & ACTIVE STATE
    // -------------------------------------------------------------------------
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // -------------------------------------------------------------------------
    // INPUT MODE SWITCHER (MIC, VIDEO UPLOAD, YOUTUBE)
    // -------------------------------------------------------------------------
    function setMode(mode) {
        currentMode = mode;
        [modeMicBtn, modeVideoBtn, modeYoutubeBtn].forEach(btn => btn.classList.remove('active'));
        [micControlsPane, videoControlsPane, youtubeControlsPane].forEach(pane => pane.style.display = 'none');

        if (mode === 'mic') {
            modeMicBtn.classList.add('active');
            micControlsPane.style.display = 'block';
        } else if (mode === 'video') {
            modeVideoBtn.classList.add('active');
            videoControlsPane.style.display = 'block';
            if (isListening) stopListening();
        } else if (mode === 'youtube') {
            modeYoutubeBtn.classList.add('active');
            youtubeControlsPane.style.display = 'block';
            if (isListening) stopListening();
        }
    }

    modeMicBtn.addEventListener('click', () => setMode('mic'));
    modeVideoBtn.addEventListener('click', () => setMode('video'));
    modeYoutubeBtn.addEventListener('click', () => setMode('youtube'));

    // -------------------------------------------------------------------------
    // MULTI-TARGET LANGUAGE SELECTION & PRESETS
    // -------------------------------------------------------------------------
    function updateLanguageChipsUI() {
        const chips = langChipsGrid.querySelectorAll('.lang-chip');
        chips.forEach(chip => {
            const code = chip.dataset.code;
            if (selectedTargetLangs.includes(code)) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        // Update presets active states
        const kth = ['kn', 'te', 'hi'];
        const south = ['kn', 'te', 'ta', 'ml'];
        presetKthBtn.classList.toggle('active', arraysEqual(selectedTargetLangs, kth));
        presetSouthBtn.classList.toggle('active', arraysEqual(selectedTargetLangs, south));

        // Update summary badge
        if (selectedTargetLangs.length === 0) {
            selectedSummaryBadge.textContent = 'None selected (Click languages below)';
        } else {
            const names = selectedTargetLangs.map(c => LANGUAGE_NAMES[c]?.name || c).join(', ');
            selectedSummaryBadge.textContent = `Selected (${selectedTargetLangs.length}): ${names}`;
        }

        // If active tab is not in selected, default to first selected
        if (!selectedTargetLangs.includes(activeTargetTab) && selectedTargetLangs.length > 0) {
            activeTargetTab = selectedTargetLangs[0];
        }
    }

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, index) => val === sortedB[index]);
    }

    // Chip Click Listener
    langChipsGrid.addEventListener('click', (e) => {
        const chip = e.target.closest('.lang-chip');
        if (!chip) return;
        const code = chip.dataset.code;
        if (selectedTargetLangs.includes(code)) {
            if (selectedTargetLangs.length > 1) {
                selectedTargetLangs = selectedTargetLangs.filter(c => c !== code);
            } else {
                showToast('At least one target language must remain selected.', 'info');
            }
        } else {
            selectedTargetLangs.push(code);
        }
        updateLanguageChipsUI();
        if (Object.keys(currentTranslations).length > 0) {
            renderTranslationsOutput();
        }
    });

    // Preset Buttons
    presetKthBtn.addEventListener('click', () => {
        selectedTargetLangs = ['kn', 'te', 'hi'];
        updateLanguageChipsUI();
        showToast('Selected Kannada, Telugu, and Hindi!', 'success');
        if (getSpeechText().trim()) translateAll();
    });

    presetSouthBtn.addEventListener('click', () => {
        selectedTargetLangs = ['kn', 'te', 'ta', 'ml'];
        updateLanguageChipsUI();
        showToast('Selected South Indian languages (Kannada, Telugu, Tamil, Malayalam)!', 'success');
        if (getSpeechText().trim()) translateAll();
    });

    presetAllBtn.addEventListener('click', () => {
        selectedTargetLangs = ['kn', 'te', 'hi', 'ta', 'ml', 'mr', 'bn', 'gu', 'en', 'es'];
        updateLanguageChipsUI();
        showToast('Selected all 10 supported languages!', 'success');
    });

    presetClearBtn.addEventListener('click', () => {
        selectedTargetLangs = ['kn']; // Default to Kannada
        updateLanguageChipsUI();
        showToast('Reset target to Kannada.', 'info');
    });

    // Input Language Change
    inputLangSelect.addEventListener('change', () => {
        const opt = inputLangSelect.options[inputLangSelect.selectedIndex];
        const speechCode = opt.dataset.speech || 'en-US';
        speechCodeTag.textContent = `Speech Engine: ${speechCode}`;
        if (isListening) {
            stopListening();
            setTimeout(startListening, 300);
        }
    });

    // -------------------------------------------------------------------------
    // TRANSLITERATION VIEW CONTROLLER (ENGLISH LETTERS VS NATIVE)
    // -------------------------------------------------------------------------
    function setScriptDisplayMode(mode) {
        scriptDisplayMode = mode;
        [scriptEnglishBtn, scriptNativeBtn, scriptBothBtn].forEach(b => b.classList.remove('active'));
        if (mode === 'english') scriptEnglishBtn.classList.add('active');
        else if (mode === 'native') scriptNativeBtn.classList.add('active');
        else if (mode === 'both') scriptBothBtn.classList.add('active');

        renderTranslationsOutput();
    }

    scriptEnglishBtn.addEventListener('click', () => setScriptDisplayMode('english'));
    scriptNativeBtn.addEventListener('click', () => setScriptDisplayMode('native'));
    scriptBothBtn.addEventListener('click', () => setScriptDisplayMode('both'));

    styleFriendlyBtn.addEventListener('click', () => {
        translitStyle = 'friendly';
        styleFriendlyBtn.classList.add('active');
        styleSimpleBtn.classList.remove('active');
        renderTranslationsOutput();
    });

    styleSimpleBtn.addEventListener('click', () => {
        translitStyle = 'simple';
        styleSimpleBtn.classList.add('active');
        styleFriendlyBtn.classList.remove('active');
        renderTranslationsOutput();
    });

    // -------------------------------------------------------------------------
    // ORIGINAL SPEECH / DIALOGUE RENDERING & STATS
    // -------------------------------------------------------------------------
    function getSpeechText() {
        return rawSpeechTextarea.value.trim();
    }

    function setSpeechContent(textOrParagraphs) {
        if (Array.isArray(textOrParagraphs)) {
            recognizedParagraphs = textOrParagraphs;
            const fullRaw = textOrParagraphs.map(p => (typeof p === 'object' ? p.text : p)).join('\n\n');
            rawSpeechTextarea.value = fullRaw;
        } else if (typeof textOrParagraphs === 'string') {
            const clean = textOrParagraphs.trim();
            rawSpeechTextarea.value = clean;
            if (clean) {
                recognizedParagraphs = clean.split('\n\n').filter(p => p.trim()).map(p => ({
                    text: p.trim(),
                    timestamp: ''
                }));
            } else {
                recognizedParagraphs = [];
            }
        }
        renderSpeechUI();
    }

    function renderSpeechUI() {
        const fullText = getSpeechText();
        if (!fullText) {
            placeholderSpeech.style.display = 'block';
            paragraphList.style.display = 'none';
            speechStats.textContent = '0 words • 0 characters • 0 paragraphs';
            return;
        }

        placeholderSpeech.style.display = 'none';
        paragraphList.style.display = 'flex';
        paragraphList.innerHTML = '';

        recognizedParagraphs.forEach((para, idx) => {
            const pElem = document.createElement('div');
            pElem.className = 'paragraph-item';
            const text = typeof para === 'object' ? para.text : para;
            const timeTag = (typeof para === 'object' && para.timestamp) ? `[${para.timestamp}] ` : '';

            pElem.innerHTML = `
                <div class="paragraph-header">
                    <span class="paragraph-badge">§ Paragraph ${idx + 1} ${timeTag ? `• ${timeTag}` : ''}</span>
                    <button class="para-copy-btn" data-text="${escapeHtml(text)}" title="Copy paragraph">📋</button>
                </div>
                <div class="paragraph-text">${escapeHtml(text)}</div>
            `;
            pElem.querySelector('.para-copy-btn').addEventListener('click', (e) => {
                copyToClipboard(e.target.dataset.text, 'Paragraph copied to clipboard!');
            });
            paragraphList.appendChild(pElem);
        });

        // Update stats
        const words = fullText.split(/\s+/).filter(w => w.length > 0).length;
        const chars = fullText.length;
        const pCount = recognizedParagraphs.length || 1;
        speechStats.textContent = `${words} words • ${chars} characters • ${pCount} paragraphs`;
    }

    // View Toggle (Paragraphs vs Raw)
    viewParagraphsBtn.addEventListener('click', () => {
        viewParagraphsBtn.classList.add('active');
        viewRawBtn.classList.remove('active');
        paragraphsContainer.style.display = 'block';
        rawContainer.style.display = 'none';
    });

    viewRawBtn.addEventListener('click', () => {
        viewRawBtn.classList.add('active');
        viewParagraphsBtn.classList.remove('active');
        paragraphsContainer.style.display = 'none';
        rawContainer.style.display = 'block';
    });

    rawSpeechTextarea.addEventListener('input', () => {
        const text = rawSpeechTextarea.value;
        const paragraphs = text.split('\n\n').filter(p => p.trim()).map(p => ({ text: p.trim() }));
        recognizedParagraphs = paragraphs;
        renderSpeechUI();
    });

    copySpeechBtn.addEventListener('click', () => {
        const text = getSpeechText();
        if (!text) {
            showToast('No speech or dialogue to copy.', 'info');
            return;
        }
        copyToClipboard(text, 'Original dialogue copied to clipboard!');
    });

    clearBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        setSpeechContent('');
        currentTranslations = {};
        renderTranslationsOutput();
        showToast('All speech and translation content cleared.', 'info');
    });

    // -------------------------------------------------------------------------
    // VIDEO / AUDIO UPLOAD LOGIC (EMBEDDED FFMPEG + SPEECH RECOGNITION)
    // -------------------------------------------------------------------------
    browseFileBtn.addEventListener('click', () => mediaFileInput.click());
    uploadDropzone.addEventListener('click', (e) => {
        if (e.target !== browseFileBtn) mediaFileInput.click();
    });

    uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
    });

    uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('dragover');
    });

    uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleSelectedFile(e.dataTransfer.files[0]);
        }
    });

    mediaFileInput.addEventListener('change', () => {
        if (mediaFileInput.files && mediaFileInput.files.length > 0) {
            handleSelectedFile(mediaFileInput.files[0]);
        }
    });

    function handleSelectedFile(file) {
        currentUploadedFile = file;
        previewFilename.textContent = file.name;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        previewFilesize.textContent = `${sizeMb} MB • ${file.type || 'Media file'}`;
        filePreviewCard.style.display = 'block';
        processFileBtn.disabled = false;

        // Video preview player
        if (file.type.startsWith('video/')) {
            const videoUrl = URL.createObjectURL(file);
            videoPreviewPlayer.src = videoUrl;
            videoPreviewWrapper.style.display = 'block';
        } else {
            videoPreviewWrapper.style.display = 'none';
        }

        showToast(`Loaded "${file.name}". Click "Transcribe & Translate Video" to process!`, 'success');
    }

    removeFileBtn.addEventListener('click', () => {
        currentUploadedFile = null;
        mediaFileInput.value = '';
        filePreviewCard.style.display = 'none';
        videoPreviewPlayer.src = '';
        videoPreviewWrapper.style.display = 'none';
        processFileBtn.disabled = true;
    });

    // Process Uploaded Video Button
    processFileBtn.addEventListener('click', async () => {
        if (!currentUploadedFile) {
            showToast('Please select a video or audio file first.', 'error');
            return;
        }

        const sourceLang = inputLangSelect.value;
        showProcessingBanner('Transcribing Video File...', 'Extracting 16kHz mono audio via FFmpeg and recognizing dialogue...');

        const formData = new FormData();
        formData.append('file', currentUploadedFile);
        formData.append('source_lang', sourceLang);
        formData.append('target_langs', JSON.stringify(selectedTargetLangs));

        try {
            const resp = await fetch('/api/transcribe_file', {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            hideProcessingBanner();

            if (!resp.ok || !data.success) {
                showToast(data.error || 'Failed to process media file.', 'error', 'Transcription Failed');
                return;
            }

            // Set original transcribed paragraphs
            setSpeechContent(data.paragraphs || data.transcribed_text);
            showToast(`Extracted dialogue from "${data.filename}" (${data.duration_formatted || ''})!`, 'success');

            // If translations came back directly
            if (data.translations && data.translations.translations) {
                currentTranslations = data.translations.translations;
                renderTranslationsOutput();
            } else {
                translateAll();
            }

            // Auto-scroll to workspace
            document.getElementById('speech-card').scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            hideProcessingBanner();
            loggerError('Upload processing error', err);
            showToast('Network error or server timeout while processing video.', 'error');
        }
    });

    // Sample Video Demo Button
    sampleVideoBtn.addEventListener('click', () => {
        const sampleDialogue = [
            { text: "Welcome everyone to Dhvani. Today we are demonstrating real-time speech recognition, video dialogue extraction, and multi-language paragraph translation.", timestamp: "00:03" },
            { text: "In this system, when an English video or speech audio is processed, whatever the speaker is saying is organized into meaningful paragraphs.", timestamp: "00:14" },
            { text: "The user can select multiple languages at once, including Kannada, Telugu, and Hindi, and read fluent English alphabet transliteration such as 'naanu' and 'hoguttiddene'.", timestamp: "00:26" }
        ];
        setSpeechContent(sampleDialogue);
        showToast('Loaded sample speech dialogue. Translating to selected languages now...', 'info');
        translateAll();
    });

    // -------------------------------------------------------------------------
    // YOUTUBE LINK EXTRACTION & PREVIEW
    // -------------------------------------------------------------------------
    pasteYtBtn.addEventListener('click', async () => {
        try {
            const clipText = await navigator.clipboard.readText();
            if (clipText) {
                youtubeUrlInput.value = clipText.trim();
                handleYoutubeUrlEntered(clipText.trim());
                showToast('Pasted YouTube link from clipboard!', 'info');
            }
        } catch (e) {
            youtubeUrlInput.focus();
            showToast('Please paste your YouTube link into the text box.', 'info');
        }
    });

    sampleYtChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.dataset.url;
            youtubeUrlInput.value = url;
            handleYoutubeUrlEntered(url);
        });
    });

    youtubeUrlInput.addEventListener('change', () => {
        handleYoutubeUrlEntered(youtubeUrlInput.value.trim());
    });

    function extractYtId(url) {
        if (!url) return null;
        if (url.length === 11 && /^[0-9A-Za-z_-]{11}$/.test(url)) return url;
        const match = url.match(/(?:v=|\/|embed\/|shorts\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)/) || url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
        return match ? match[1] : null;
    }

    function handleYoutubeUrlEntered(url) {
        const videoId = extractYtId(url);
        if (videoId) {
            ytEmbedFrame.src = `https://www.youtube.com/embed/${videoId}`;
            ytPreviewContainer.style.display = 'block';
        } else {
            ytPreviewContainer.style.display = 'none';
        }
    }

    processYtBtn.addEventListener('click', async () => {
        const url = youtubeUrlInput.value.trim();
        if (!url) {
            showToast('Please paste a valid YouTube video link.', 'error');
            return;
        }

        handleYoutubeUrlEntered(url);
        showProcessingBanner('Fetching YouTube Speech...', 'Retrieving video transcript and speech cues from YouTube...');

        try {
            const resp = await fetch('/api/process_youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    source_lang: inputLangSelect.value,
                    target_langs: selectedTargetLangs
                })
            });

            const data = await resp.json();
            hideProcessingBanner();

            if (!resp.ok || !data.success) {
                showToast(data.error || 'Failed to extract speech from YouTube.', 'error', 'YouTube Processing Error');
                return;
            }

            // Set speech dialogue
            setSpeechContent(data.paragraphs || data.transcript_text);
            showToast(`Extracted dialogue from YouTube video (${data.language_name || data.detected_lang})!`, 'success');

            // Render multi-language translations
            if (data.translations && data.translations.translations) {
                currentTranslations = data.translations.translations;
                renderTranslationsOutput();
            } else {
                translateAll();
            }

            // Scroll to workspace
            document.getElementById('speech-card').scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            hideProcessingBanner();
            loggerError('YouTube extraction error', err);
            showToast('Network error while extracting YouTube video.', 'error');
        }
    });

    function showProcessingBanner(title, subtitle) {
        processingTitle.textContent = title;
        processingSubtitle.textContent = subtitle;
        globalProcessingBanner.style.display = 'flex';
    }

    function hideProcessingBanner() {
        globalProcessingBanner.style.display = 'none';
    }

    // -------------------------------------------------------------------------
    // MULTI-TARGET TRANSLATION & TRANSLITERATION EXECUTION
    // -------------------------------------------------------------------------
    translateBtn.addEventListener('click', () => translateAll());

    async function translateAll() {
        const text = getSpeechText();
        if (!text) {
            showToast('No speech or dialogue found. Please speak, upload a video, or enter text first.', 'error');
            return;
        }

        if (selectedTargetLangs.length === 0) {
            showToast('Please select at least one target language.', 'error');
            return;
        }

        const sourceLang = inputLangSelect.value;
        const targetNames = selectedTargetLangs.map(c => LANGUAGE_NAMES[c]?.name || c).join(', ');

        translationLoadingText.textContent = `Translating into ${targetNames} with English transliteration...`;
        translationLoading.style.display = 'flex';
        placeholderTranslation.style.display = 'none';

        try {
            const resp = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    source_lang: sourceLang,
                    target_langs: selectedTargetLangs
                })
            });

            const data = await resp.json();
            translationLoading.style.display = 'none';

            if (!resp.ok || !data.success) {
                showToast(data.error || 'Translation failed.', 'error', 'Translation Error');
                return;
            }

            currentTranslations = data.translations || {};
            renderTranslationsOutput();
            showToast(`Successfully translated into ${targetNames}!`, 'success');

        } catch (err) {
            translationLoading.style.display = 'none';
            loggerError('Translation request error', err);
            showToast('Server error while translating paragraphs.', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // RENDER TRANSLATION & TRANSLITERATION OUTPUT
    // -------------------------------------------------------------------------
    function renderTranslationsOutput() {
        const transKeys = Object.keys(currentTranslations);
        if (transKeys.length === 0) {
            placeholderTranslation.style.display = 'block';
            targetLangTabs.style.display = 'none';
            activeLangPanel.style.display = 'none';
            allLangsGridPanel.style.display = 'none';
            translationStats.textContent = '0 words • 0 characters';
            return;
        }

        placeholderTranslation.style.display = 'none';

        // Build Language Switcher Tabs
        targetLangTabs.style.display = 'flex';
        targetLangTabs.innerHTML = '';

        transKeys.forEach(code => {
            const info = LANGUAGE_NAMES[code] || { name: code, native: code, flag: '🌐' };
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = `lang-tab-btn ${code === activeTargetTab ? 'active' : ''}`;
            tabBtn.innerHTML = `<span>${info.flag}</span> <span>${info.name}</span> <span style="opacity:0.75">(${info.native})</span>`;
            tabBtn.addEventListener('click', () => {
                activeTargetTab = code;
                renderTranslationsOutput();
            });
            targetLangTabs.appendChild(tabBtn);
        });

        // Add Combined All-Grid Tab if more than 1 language
        if (transKeys.length > 1) {
            const gridTabBtn = document.createElement('button');
            gridTabBtn.type = 'button';
            gridTabBtn.className = `lang-tab-btn lang-tab-grid-btn ${activeTargetTab === 'grid' ? 'active' : ''}`;
            gridTabBtn.innerHTML = `<span>📑 All Languages Grid</span>`;
            gridTabBtn.addEventListener('click', () => {
                activeTargetTab = 'grid';
                renderTranslationsOutput();
            });
            targetLangTabs.appendChild(gridTabBtn);
        }

        // Render Panel according to tab
        if (activeTargetTab === 'grid') {
            activeLangPanel.style.display = 'none';
            renderAllLangsGrid();
        } else {
            allLangsGridPanel.style.display = 'none';
            renderSingleLangPanel(activeTargetTab);
        }
    }

    function renderSingleLangPanel(code) {
        const data = currentTranslations[code];
        if (!data) return;

        const info = LANGUAGE_NAMES[code] || { name: code, native: code, flag: '🌐' };
        activeLangPanel.style.display = 'block';
        activeLangPanel.innerHTML = '';

        const nativeText = data.translated_text || '';
        const translitFriendly = data.transliterated_friendly || data.transliterated_text || '';
        const translitSimple = data.transliterated_simple || data.transliterated_friendly || '';
        const translitText = translitStyle === 'friendly' ? translitFriendly : translitSimple;

        // Choose layout based on scriptDisplayMode
        if (scriptDisplayMode === 'english') {
            // English Alphabet View (Kanglish / Hinglish / Tenglish)
            activeLangPanel.innerHTML = `
                <div class="script-section-card">
                    <div class="script-section-header">
                        <div class="script-badge-group">
                            <span class="script-title-badge badge-translit">🔤 ${info.name} in English Letters (${getDialectName(code)})</span>
                        </div>
                        <div class="script-actions">
                            <button class="btn-mini-action" id="copy-active-translit-btn" type="button" title="Copy English Letters">📋 Copy English</button>
                            <button class="btn-mini-action" id="listen-active-btn" type="button" title="Listen aloud">🔊 Listen</button>
                        </div>
                    </div>
                    <div class="translit-content-text">${escapeHtml(translitText)}</div>
                </div>
            `;
        } else if (scriptDisplayMode === 'native') {
            // Native Script View
            activeLangPanel.innerHTML = `
                <div class="script-section-card">
                    <div class="script-section-header">
                        <div class="script-badge-group">
                            <span class="script-title-badge badge-native">✍️ ${info.name} (${info.native})</span>
                        </div>
                        <div class="script-actions">
                            <button class="btn-mini-action" id="copy-active-native-btn" type="button" title="Copy Native Script">📋 Copy Native</button>
                            <button class="btn-mini-action" id="listen-active-btn" type="button" title="Listen aloud">🔊 Listen</button>
                        </div>
                    </div>
                    <div class="native-content-text">${escapeHtml(nativeText)}</div>
                </div>
            `;
        } else {
            // Dual View (Both Side-by-Side)
            activeLangPanel.innerHTML = `
                <div class="dual-script-grid">
                    <div class="script-section-card">
                        <div class="script-section-header">
                            <span class="script-title-badge badge-translit">🔤 English Letters (${getDialectName(code)})</span>
                            <button class="btn-mini-action" id="copy-active-translit-btn" type="button">📋 Copy</button>
                        </div>
                        <div class="translit-content-text">${escapeHtml(translitText)}</div>
                    </div>
                    <div class="script-section-card">
                        <div class="script-section-header">
                            <span class="script-title-badge badge-native">✍️ ${info.native} (Native Script)</span>
                            <div class="script-actions">
                                <button class="btn-mini-action" id="copy-active-native-btn" type="button">📋 Copy</button>
                                <button class="btn-mini-action" id="listen-active-btn" type="button">🔊 Listen</button>
                            </div>
                        </div>
                        <div class="native-content-text">${escapeHtml(nativeText)}</div>
                    </div>
                </div>
            `;
        }

        // Attach listeners
        const copyTranslitBtn = activeLangPanel.querySelector('#copy-active-translit-btn');
        if (copyTranslitBtn) {
            copyTranslitBtn.addEventListener('click', () => copyToClipboard(translitText, `${info.name} English letters copied!`));
        }

        const copyNativeBtn = activeLangPanel.querySelector('#copy-active-native-btn');
        if (copyNativeBtn) {
            copyNativeBtn.addEventListener('click', () => copyToClipboard(nativeText, `${info.name} native text copied!`));
        }

        const listenBtn = activeLangPanel.querySelector('#listen-active-btn');
        if (listenBtn) {
            listenBtn.addEventListener('click', () => speakAloud(nativeText, data.speech_code || `${code}-IN`));
        }

        // Update stats
        const words = nativeText.split(/\s+/).filter(w => w.length > 0).length;
        translationStats.textContent = `${words} words • ${nativeText.length} characters • ${info.name}`;
    }

    function renderAllLangsGrid() {
        allLangsGridPanel.style.display = 'grid';
        allLangsGridPanel.innerHTML = '';

        const transKeys = Object.keys(currentTranslations);
        transKeys.forEach(code => {
            const data = currentTranslations[code];
            const info = LANGUAGE_NAMES[code] || { name: code, native: code, flag: '🌐' };
            const nativeText = data.translated_text || '';
            const translitText = translitStyle === 'friendly' ? (data.transliterated_friendly || '') : (data.transliterated_simple || '');

            const card = document.createElement('div');
            card.className = 'lang-grid-card';
            card.innerHTML = `
                <div class="lang-grid-card-header">
                    <span class="lang-grid-title">${info.flag} ${info.name} (${info.native})</span>
                    <button class="btn-mini-action listen-grid-btn" type="button" title="Listen">🔊</button>
                </div>
                <div class="lang-grid-content">
                    <p style="margin-bottom:0.5rem; font-weight:600; color:#3D3155;">🔤 ${escapeHtml(translitText)}</p>
                    <p style="color:#1E1B4B; opacity:0.9;">✍️ ${escapeHtml(nativeText)}</p>
                </div>
                <div class="card-footer-actions" style="margin-top:0.75rem;">
                    <button class="btn-mini-action copy-grid-btn" type="button">📋 Copy All</button>
                </div>
            `;

            card.querySelector('.listen-grid-btn').addEventListener('click', () => {
                speakAloud(nativeText, data.speech_code || `${code}-IN`);
            });

            card.querySelector('.copy-grid-btn').addEventListener('click', () => {
                const combined = `${info.name} (${info.native}):\n${nativeText}\n\nEnglish Letters (${getDialectName(code)}):\n${translitText}`;
                copyToClipboard(combined, `${info.name} text & transliteration copied!`);
            });

            allLangsGridPanel.appendChild(card);
        });
    }

    function getDialectName(code) {
        switch (code) {
            case 'kn': return 'Kanglish';
            case 'hi': return 'Hinglish';
            case 'te': return 'Tenglish';
            case 'ta': return 'Tanglish';
            case 'ml': return 'Manglish';
            default: return 'English Letters';
        }
    }

    copyTranslationBtn.addEventListener('click', () => {
        if (activeTargetTab === 'grid') {
            const allText = Object.keys(currentTranslations).map(c => {
                const info = LANGUAGE_NAMES[c]?.name || c;
                return `=== ${info} ===\nNative: ${currentTranslations[c].translated_text}\nEnglish Letters: ${currentTranslations[c].transliterated_friendly}`;
            }).join('\n\n');
            copyToClipboard(allText, 'All translations copied to clipboard!');
        } else {
            const data = currentTranslations[activeTargetTab];
            if (!data) {
                showToast('No active translation to copy.', 'info');
                return;
            }
            const copyContent = scriptDisplayMode === 'english' ? data.transliterated_friendly : data.translated_text;
            copyToClipboard(copyContent, 'Active translation copied to clipboard!');
        }
    });

    speakTranslationBtn.addEventListener('click', () => {
        const data = currentTranslations[activeTargetTab];
        if (data && data.translated_text) {
            speakAloud(data.translated_text, data.speech_code || `${activeTargetTab}-IN`);
        } else {
            showToast('No translation available to read aloud.', 'info');
        }
    });

    // -------------------------------------------------------------------------
    // SUBTITLE (.SRT) & TEXT EXPORT
    // -------------------------------------------------------------------------
    downloadSpeechSrt.addEventListener('click', () => {
        if (!recognizedParagraphs.length) {
            showToast('No speech dialogue to download.', 'error');
            return;
        }
        const srtContent = generateSrt(recognizedParagraphs);
        downloadFile(srtContent, 'dhvani_dialogue.srt', 'text/plain');
        showToast('Downloaded original dialogue subtitles (.SRT)!', 'success');
    });

    downloadTransSrt.addEventListener('click', () => {
        const data = currentTranslations[activeTargetTab];
        if (!data || !data.paragraphs || data.paragraphs.length === 0) {
            showToast('Please translate speech or video dialogue first.', 'error');
            return;
        }
        const targetList = data.paragraphs.map((p, idx) => {
            const orig = recognizedParagraphs[idx] || {};
            return {
                text: scriptDisplayMode === 'english' ? (data.paragraphs_transliterated[idx] || p) : p,
                start: orig.start || idx * 4.0,
                end: orig.end || (idx + 1) * 4.0
            };
        });
        const srtContent = generateSrt(targetList);
        downloadFile(srtContent, `dhvani_subtitles_${activeTargetTab}.srt`, 'text/plain');
        showToast(`Downloaded ${LANGUAGE_NAMES[activeTargetTab]?.name || ''} subtitles (.SRT)!`, 'success');
    });

    downloadTransTxt.addEventListener('click', () => {
        const data = currentTranslations[activeTargetTab];
        if (!data) {
            showToast('No translation to export.', 'error');
            return;
        }
        const info = LANGUAGE_NAMES[activeTargetTab] || { name: activeTargetTab };
        const content = `DHVANI MULTILINGUAL TRANSLATION & TRANSLITERATION REPORT
============================================================
Target Language: ${info.name} (${info.native})
Spoken Input: ${LANGUAGE_NAMES[inputLangSelect.value]?.name || 'English'}

[ORIGINAL SPEECH / VIDEO DIALOGUE]
${getSpeechText()}

[TRANSLATED TEXT (${info.name} - Native Script)]
${data.translated_text}

[TRANSLITERATED TEXT (English Letters - ${getDialectName(activeTargetTab)})]
${data.transliterated_friendly}
`;
        downloadFile(content, `dhvani_translation_${activeTargetTab}.txt`, 'text/plain');
        showToast('Exported translation document (.TXT)!', 'success');
    });

    function generateSrt(items) {
        let srt = '';
        items.forEach((item, idx) => {
            const startSec = item.start !== undefined ? item.start : idx * 4.0;
            const endSec = item.end !== undefined ? item.end : (idx + 1) * 4.0;
            const text = item.text || item;
            srt += `${idx + 1}\n`;
            srt += `${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n`;
            srt += `${text}\n\n`;
        });
        return srt.trim();
    }

    function formatSrtTime(totalSec) {
        const secInt = Math.floor(totalSec);
        const ms = Math.floor((totalSec - secInt) * 1000);
        const hrs = Math.floor(secInt / 3600);
        const mins = Math.floor((secInt % 3600) / 60);
        const secs = secInt % 60;
        return `${padZero(hrs)}:${padZero(mins)}:${padZero(secs)},${padZero3(ms)}`;
    }

    function padZero(n) { return n < 10 ? '0' + n : n; }
    function padZero3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : n); }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // -------------------------------------------------------------------------
    // BROWSER WEB SPEECH API (REAL-TIME MICROPHONE RECOGNITION)
    // -------------------------------------------------------------------------
    function initSpeechRecognition() {
        if (!isSpeechSupported) {
            setStatus('error');
            statusText.textContent = 'Mic Not Supported';
            showToast('Web Speech API is not supported in this browser. Please use Chrome or Edge.', 'error');
            startBtn.disabled = true;
            return;
        }

        try {
            recognition = new SpeechRecognition();
            recognition.continuous = false; // Prevents WebSocket timeouts on Windows
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                isListening = true;
                networkRetryCount = 0;
                setStatus('listening');
                interimPreview.style.display = 'block';
                interimText.textContent = 'Listening for speech...';
                if (networkTroubleshootBox) networkTroubleshootBox.style.display = 'none';
            };

            recognition.onresult = (event) => {
                lastSpeechTimestamp = Date.now();
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (interimTranscript.trim()) {
                    interimPreview.style.display = 'block';
                    interimText.textContent = interimTranscript.trim();
                }

                if (finalTranscript.trim()) {
                    handleFinalSpeechChunk(finalTranscript.trim());
                    interimText.textContent = 'Listening...';
                }
            };

            recognition.onerror = (event) => {
                loggerError('Speech recognition error:', event.error);
                if (event.error === 'network') {
                    if (networkRetryCount < MAX_NETWORK_RETRIES && isListening) {
                        networkRetryCount++;
                        restartListening(400);
                        return;
                    }
                    setStatus('error');
                    statusText.textContent = 'Network Problem';
                    if (networkTroubleshootBox) networkTroubleshootBox.style.display = 'block';
                    showToast('Microphone connection interrupted. See suggestions below.', 'error', 'Network Issue');
                } else if (event.error === 'not-allowed') {
                    setStatus('error');
                    statusText.textContent = 'Mic Blocked';
                    showToast('Microphone access was denied. Please allow microphone permissions.', 'error');
                } else if (event.error !== 'no-speech') {
                    showToast(`Speech recognition note: ${event.error}`, 'info');
                }
            };

            recognition.onend = () => {
                if (isListening) {
                    restartListening(150);
                } else {
                    setStatus('stopped');
                    interimPreview.style.display = 'none';
                }
            };

        } catch (e) {
            loggerError('Failed to initialize SpeechRecognition', e);
        }
    }

    function startListening() {
        if (!isSpeechSupported || !recognition) return;
        try {
            const opt = inputLangSelect.options[inputLangSelect.selectedIndex];
            recognition.lang = opt.dataset.speech || 'en-US';
            isListening = true;
            recognition.start();
        } catch (e) {
            loggerError('Failed to start speech recognition', e);
        }
    }

    function stopListening() {
        isListening = false;
        if (restartTimeoutId) clearTimeout(restartTimeoutId);
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
        }
        setStatus('stopped');
        interimPreview.style.display = 'none';
    }

    function restartListening(delayMs = 150) {
        if (restartTimeoutId) clearTimeout(restartTimeoutId);
        restartTimeoutId = setTimeout(() => {
            if (isListening && recognition) {
                try {
                    const opt = inputLangSelect.options[inputLangSelect.selectedIndex];
                    recognition.lang = opt.dataset.speech || 'en-US';
                    recognition.start();
                } catch (e) {}
            }
        }, delayMs);
    }

    function handleFinalSpeechChunk(text) {
        let clean = text.trim();
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        if (!clean.endsWith('.') && !clean.endsWith('?') && !clean.endsWith('!')) {
            clean += '.';
        }

        const now = Date.now();
        const shouldBreak = (now - lastSpeechTimestamp > PAUSE_THRESHOLD_MS) && recognizedParagraphs.length > 0;
        
        if (shouldBreak || recognizedParagraphs.length === 0) {
            recognizedParagraphs.push({ text: clean, timestamp: '' });
        } else {
            const lastIdx = recognizedParagraphs.length - 1;
            recognizedParagraphs[lastIdx].text += ' ' + clean;
        }

        const fullRaw = recognizedParagraphs.map(p => p.text).join('\n\n');
        rawSpeechTextarea.value = fullRaw;
        renderSpeechUI();
    }

    startBtn.addEventListener('click', () => {
        setMode('mic');
        startListening();
    });

    stopBtn.addEventListener('click', () => stopListening());

    demoSpeechBtn.addEventListener('click', () => {
        const demoSentences = [
            "Good morning everyone. This is a live demonstration of the Dhvani multilingual platform.",
            "The system accurately captures speech, arranges sentences into paragraphs, and translates to multiple languages.",
            "When Kannada is selected, it outputs both native script and readable English alphabet letters such as 'naanu'."
        ];
        setSpeechContent(demoSentences.join('\n\n'));
        showToast('Sample speech loaded! Translating to selected languages...', 'info');
        translateAll();
    });

    if (closeTroubleshootBtn) {
        closeTroubleshootBtn.addEventListener('click', () => {
            networkTroubleshootBox.style.display = 'none';
        });
    }

    if (troubleshootRetryBtn) {
        troubleshootRetryBtn.addEventListener('click', () => {
            networkTroubleshootBox.style.display = 'none';
            startListening();
        });
    }

    // -------------------------------------------------------------------------
    // STATUS UTILITIES
    // -------------------------------------------------------------------------
    function setStatus(state) {
        statusPill.className = 'status-pill';
        switch (state) {
            case 'listening':
                statusPill.classList.add('status-listening');
                statusText.textContent = 'Listening...';
                audioVisualizer.classList.add('active');
                startBtn.disabled = true;
                stopBtn.disabled = false;
                break;
            case 'processing':
                statusPill.classList.add('status-processing');
                statusText.textContent = 'Processing...';
                audioVisualizer.classList.remove('active');
                startBtn.disabled = true;
                stopBtn.disabled = true;
                break;
            case 'stopped':
                statusPill.classList.add('status-stopped');
                statusText.textContent = 'Stopped';
                audioVisualizer.classList.remove('active');
                startBtn.disabled = false;
                stopBtn.disabled = true;
                break;
            case 'error':
                statusPill.classList.add('status-error');
                statusText.textContent = 'Error';
                audioVisualizer.classList.remove('active');
                startBtn.disabled = false;
                stopBtn.disabled = true;
                break;
            default:
                statusPill.classList.add('status-ready');
                statusText.textContent = 'Ready';
                audioVisualizer.classList.remove('active');
                startBtn.disabled = false;
                stopBtn.disabled = true;
        }
    }

    // -------------------------------------------------------------------------
    // TEXT-TO-SPEECH (TTS) AUDIO SYNTHESIS
    // -------------------------------------------------------------------------
    function speakAloud(text, langCode) {
        if (!('speechSynthesis' in window)) {
            showToast('Text-to-speech is not supported in this browser.', 'info');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode || 'en-US';
        utterance.rate = 0.95;

        // Try selecting matching voice if available
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(langCode.slice(0, 2)));
        if (matchingVoice) utterance.voice = matchingVoice;

        utterance.onstart = () => showToast(`Playing audio in ${langCode}...`, 'info');
        window.speechSynthesis.speak(utterance);
    }

    function copyToClipboard(text, successMsg) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg, 'success');
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast(successMsg, 'success');
        });
    }

    function loggerError(msg, err) {
        console.error(`[DHVANI] ${msg}`, err);
    }

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------
    updateLanguageChipsUI();
    initSpeechRecognition();
    setStatus('ready');
});
