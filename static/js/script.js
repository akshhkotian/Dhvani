/**
 * DHVANI
 * “A Real-Time Multilingual Speech Recognition and Paragraph Translation System”
 * Pure Vanilla JavaScript Frontend Controller (No React, No External Libraries)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // DOM ELEMENTS
    // -------------------------------------------------------------------------
    const inputLangSelect = document.getElementById('input-language');
    const targetLangSelect = document.getElementById('target-language');
    const swapLanguagesBtn = document.getElementById('swap-languages-btn');
    const speechCodeTag = document.getElementById('speech-code-tag');
    const targetCodeTag = document.getElementById('target-code-tag');
    const targetBadge = document.getElementById('target-badge');

    const heroStartBtn = document.getElementById('hero-start-btn');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const demoSpeechBtn = document.getElementById('demo-speech-btn');
    const clearBtn = document.getElementById('clear-btn');

    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const audioVisualizer = document.getElementById('audio-visualizer');

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

    const translateBtn = document.getElementById('translate-btn');
    const copyTranslationBtn = document.getElementById('copy-translation-btn');
    const speakTranslationBtn = document.getElementById('speak-translation-btn');
    const translationContainer = document.getElementById('translation-container');
    const placeholderTranslation = document.getElementById('placeholder-translation');
    const translationList = document.getElementById('translation-list');
    const translationLoading = document.getElementById('translation-loading');
    const translationStats = document.getElementById('translation-stats');

    // Network Troubleshooting Box Elements
    const networkTroubleshootBox = document.getElementById('network-troubleshoot-box');
    const closeTroubleshootBtn = document.getElementById('close-troubleshoot-btn');
    const troubleshootRetryBtn = document.getElementById('troubleshoot-retry-btn');
    const switchLocalhostLink = document.getElementById('switch-localhost-link');

    const toastContainer = document.getElementById('toast-container');

    // -------------------------------------------------------------------------
    // APPLICATION STATE
    // -------------------------------------------------------------------------
    let recognition = null;
    let isListening = false;
    let networkRetryCount = 0;
    const MAX_NETWORK_RETRIES = 2;
    let restartTimeoutId = null;
    let recognizedParagraphs = []; // Array of finalized sentence/paragraph strings
    let translatedParagraphs = []; // Array of translated paragraph strings
    let lastSpeechTimestamp = 0;
    const PAUSE_THRESHOLD_MS = 2200; // 2.2 seconds pause creates a new paragraph break

    // Check Browser Web Speech API Support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognition;

    // -------------------------------------------------------------------------
    // NOTIFICATION TOAST UTILITY
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', title = '') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            error: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };
        const defaultTitles = {
            error: 'Error',
            success: 'Success',
            info: 'Notice'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <div class="toast-body">
                <div class="toast-title">${title || defaultTitles[type] || 'Notification'}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // -------------------------------------------------------------------------
    // STATUS INDICATOR MANAGEMENT
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
            case 'ready':
            default:
                statusPill.classList.add('status-ready');
                statusText.textContent = 'Ready';
                audioVisualizer.classList.remove('active');
                startBtn.disabled = false;
                stopBtn.disabled = true;
                break;
        }
    }

    // -------------------------------------------------------------------------
    // SPEECH RECOGNITION INITIALIZATION
    // -------------------------------------------------------------------------
    function initSpeechRecognition() {
        if (!isSpeechSupported) {
            showToast(
                'Your browser does not support the Web Speech API. Please use Google Chrome, Microsoft Edge, or Safari for voice input.',
                'error',
                'Browser Incompatible'
            );
            startBtn.disabled = true;
            return;
        }

        try {
            recognition = new SpeechRecognition();
            // Crucial: continuous = false avoids Chrome's persistent WebSocket network timeout bug!
            // When each phrase/sentence finishes, onend restarts seamlessly while isListening is true.
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            updateRecognitionLanguage();

            // 1. On Start
            recognition.onstart = () => {
                setStatus('listening');
                lastSpeechTimestamp = Date.now();
                // If previously showing troubleshoot box and now recognized, hide it
                if (networkRetryCount === 0 && networkTroubleshootBox) {
                    networkTroubleshootBox.style.display = 'none';
                }
            };

            // 2. On Result (Real-Time Speech -> Text)
            recognition.onresult = (event) => {
                const currentTime = Date.now();
                const timeSinceLastSpeech = currentTime - lastSpeechTimestamp;
                lastSpeechTimestamp = currentTime;
                networkRetryCount = 0; // Successful speech chunk; reset retry counter

                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPiece = event.results[i][0].transcript.trim();

                    if (event.results[i].isFinal) {
                        if (transcriptPiece.length > 0) {
                            handleFinalizedSpeech(transcriptPiece, timeSinceLastSpeech);
                        }
                    } else {
                        interimTranscript += ' ' + transcriptPiece;
                    }
                }

                // Display interim live speech feedback
                if (interimTranscript.trim().length > 0) {
                    interimText.textContent = interimTranscript.trim();
                    interimPreview.style.display = 'flex';
                } else {
                    interimPreview.style.display = 'none';
                }
            };

            // 3. On Error
            recognition.onerror = (event) => {
                console.warn('Speech recognition event error:', event.error);
                audioVisualizer.classList.remove('active');

                switch (event.error) {
                    case 'network':
                        console.error('Speech Network Error: Connection to speech recognition servers failed.');
                        if (networkRetryCount < MAX_NETWORK_RETRIES && isListening) {
                            networkRetryCount++;
                            showToast(`Reconnecting speech engine (attempt ${networkRetryCount}/${MAX_NETWORK_RETRIES})...`, 'info', 'Reconnecting');
                            scheduleRestart(500);
                        } else {
                            isListening = false;
                            setStatus('stopped');
                            if (networkTroubleshootBox) {
                                networkTroubleshootBox.style.display = 'block';
                                networkTroubleshootBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                            showToast(
                                'Speech network error: Google speech servers unreachable. See resolution tips below.',
                                'error',
                                'Network Error'
                            );
                        }
                        break;

                    case 'not-allowed':
                        isListening = false;
                        setStatus('stopped');
                        showToast(
                            'Microphone permission was denied. Please allow microphone access in your browser address bar and try again.',
                            'error',
                            'Permission Denied'
                        );
                        break;

                    case 'no-speech':
                        // Silence in this chunk; keep listening if user hasn't pressed stop
                        if (isListening) {
                            scheduleRestart(200);
                        } else {
                            setStatus('stopped');
                        }
                        break;

                    case 'audio-capture':
                        isListening = false;
                        setStatus('stopped');
                        showToast(
                            'No microphone detected on your device. Please verify your microphone and Windows privacy settings.',
                            'error',
                            'Microphone Missing'
                        );
                        break;

                    case 'aborted':
                        if (!isListening) {
                            setStatus('stopped');
                        }
                        break;

                    default:
                        console.warn(`Speech warning: ${event.error}`);
                        if (isListening) {
                            scheduleRestart(300);
                        } else {
                            setStatus('stopped');
                        }
                        break;
                }
            };

            // 4. On End
            recognition.onend = () => {
                interimPreview.style.display = 'none';
                if (isListening) {
                    // Chunk completed; smoothly restart for subsequent sentences
                    scheduleRestart(180);
                } else {
                    setStatus('stopped');
                }
            };

        } catch (err) {
            console.error('Failed to initialize speech recognition:', err);
        }
    }

    function scheduleRestart(delayMs = 200) {
        if (restartTimeoutId) clearTimeout(restartTimeoutId);
        restartTimeoutId = setTimeout(() => {
            if (isListening && recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    // If recognition is already active or transitioning, ignore quietly
                    console.debug('Recognition restart handled:', e.message);
                }
            }
        }, delayMs);
    }

    function updateRecognitionLanguage() {
        if (!recognition) return;
        const selectedOption = inputLangSelect.options[inputLangSelect.selectedIndex];
        const speechCode = selectedOption.getAttribute('data-speech') || 'en-US';
        recognition.lang = speechCode;
        speechCodeTag.textContent = `Speech Engine: ${speechCode}`;
    }

    // -------------------------------------------------------------------------
    // PARAGRAPH FORMATION ALGORITHM
    // -------------------------------------------------------------------------
    /**
     * Organizes recognized continuous speech into formatted readable paragraphs.
     * Capitalizes initial letters, ensures punctuation, and breaks text by:
     * 1) Terminal punctuation (. ? ! ।)
     * 2) Noticeable silence/pause (> 2.2 seconds)
     */
    function handleFinalizedSpeech(phrase, timeSinceLastSpeech) {
        if (!phrase) return;

        // Clean and format sentence
        let formatted = phrase.trim();

        // Capitalize first character if Latin-based script
        if (/^[a-z]/i.test(formatted)) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        // Add period if sentence lacks terminal punctuation
        const terminalPunctuation = /[.!?।]$/;
        if (!terminalPunctuation.test(formatted)) {
            // Check if Indian language uses danda or standard period
            const inputLang = inputLangSelect.value;
            if (inputLang === 'hi') {
                formatted += '।';
            } else {
                formatted += '.';
            }
        }

        // If significant pause occurred between speech chunks, start a new paragraph
        // Or if current list is empty, start first paragraph
        if (recognizedParagraphs.length === 0 || timeSinceLastSpeech > PAUSE_THRESHOLD_MS) {
            recognizedParagraphs.push(formatted);
        } else {
            // Append as a readable sentence to the current paragraph
            const lastIndex = recognizedParagraphs.length - 1;
            recognizedParagraphs[lastIndex] += ' ' + formatted;
        }

        renderParagraphs();
        updateRawTextarea();
        updateSpeechStats();
    }

    function renderParagraphs() {
        if (recognizedParagraphs.length === 0) {
            placeholderSpeech.style.display = 'flex';
            paragraphList.style.display = 'none';
            paragraphList.innerHTML = '';
            return;
        }

        placeholderSpeech.style.display = 'none';
        paragraphList.style.display = 'flex';
        paragraphList.innerHTML = '';

        recognizedParagraphs.forEach((para, index) => {
            const pElement = document.createElement('div');
            pElement.className = 'paragraph-item';
            pElement.innerHTML = `
                <span class="paragraph-tag">¶ ${index + 1}</span>
                <span class="paragraph-text">${escapeHtml(para)}</span>
            `;
            paragraphList.appendChild(pElement);
        });

        // Auto-scroll to latest paragraph
        paragraphsContainer.scrollTop = paragraphsContainer.scrollHeight;
    }

    function updateRawTextarea() {
        rawSpeechTextarea.value = recognizedParagraphs.join('\n\n');
    }

    function updateSpeechStats() {
        const fullText = recognizedParagraphs.join(' ').trim();
        const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
        const chars = fullText.length;
        const paras = recognizedParagraphs.length;
        speechStats.textContent = `${words} words • ${chars} characters • ${paras} paragraphs`;
    }

    // -------------------------------------------------------------------------
    // CONTROLS: START, STOP, CLEAR, SWAP
    // -------------------------------------------------------------------------
    async function startListening() {
        if (!isSpeechSupported) {
            showToast('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.', 'error', 'Browser Incompatible');
            return;
        }

        // Cancel any pending restart timeouts
        if (restartTimeoutId) {
            clearTimeout(restartTimeoutId);
            restartTimeoutId = null;
        }

        // Pre-warm the microphone hardware via getUserMedia to prevent driver timeouts in Windows
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Release audio stream immediately so SpeechRecognition has full exclusive access
                stream.getTracks().forEach(t => t.stop());
            } catch (micErr) {
                console.warn('Microphone pre-check warning:', micErr);
                if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
                    showToast('Microphone access was denied. Please allow microphone permissions in your browser.', 'error', 'Permission Denied');
                    return;
                }
            }
        }

        try {
            updateRecognitionLanguage();
            isListening = true;
            networkRetryCount = 0;
            if (networkTroubleshootBox) {
                networkTroubleshootBox.style.display = 'none';
            }
            recognition.start();
            setStatus('listening');
        } catch (error) {
            console.warn('Recognition start exception:', error);
            try {
                recognition.stop();
                setTimeout(() => {
                    if (isListening) {
                        recognition.start();
                        setStatus('listening');
                    }
                }, 250);
            } catch (err) {
                showToast(`Unable to start speech recognition: ${err.message}`, 'error');
            }
        }
    }

    function stopListening() {
        if (restartTimeoutId) {
            clearTimeout(restartTimeoutId);
            restartTimeoutId = null;
        }
        isListening = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.debug(e);
            }
        }
        setStatus('stopped');
    }

    function clearAll() {
        stopListening();
        recognizedParagraphs = [];
        translatedParagraphs = [];
        rawSpeechTextarea.value = '';
        renderParagraphs();
        renderTranslation();
        updateSpeechStats();
        updateTranslationStats();
        setStatus('ready');
        showToast('All speech and translations cleared.', 'info');
    }

    function swapLanguages() {
        const currentInput = inputLangSelect.value;
        const currentTarget = targetLangSelect.value;

        // Prevent swapping if they are identical
        if (currentInput === currentTarget) {
            showToast('Input and Target languages are already the same.', 'info');
            return;
        }

        // Swap select values
        inputLangSelect.value = currentTarget;
        targetLangSelect.value = currentInput;

        // If currently recognizing, restart with new language
        const wasListening = isListening;
        if (wasListening) {
            stopListening();
        }

        updateLanguageLabels();
        updateRecognitionLanguage();

        if (wasListening) {
            setTimeout(() => startListening(), 300);
        }

        showToast(`Languages swapped: ${inputLangSelect.options[inputLangSelect.selectedIndex].text} ↔ ${targetLangSelect.options[targetLangSelect.selectedIndex].text}`, 'success');
    }

    function updateLanguageLabels() {
        const selectedInput = inputLangSelect.options[inputLangSelect.selectedIndex];
        const selectedTarget = targetLangSelect.options[targetLangSelect.selectedIndex];

        const speechCode = selectedInput.getAttribute('data-speech') || 'en-US';
        speechCodeTag.textContent = `Speech Engine: ${speechCode}`;
        targetCodeTag.textContent = `Target Output: ${selectedTarget.value} (${selectedTarget.text.split(' ')[0]})`;
        targetBadge.textContent = selectedTarget.text;
    }

    // -------------------------------------------------------------------------
    // TRANSLATION API INTEGRATION (Flask Backend POST /api/translate)
    // -------------------------------------------------------------------------
    async function translateParagraphs() {
        // Collect current text (either from structured paragraphs or manually edited raw textarea)
        let textToTranslate = '';
        if (viewRawBtn.classList.contains('active')) {
            textToTranslate = rawSpeechTextarea.value.trim();
        } else {
            textToTranslate = recognizedParagraphs.join('\n\n').trim();
        }

        if (!textToTranslate) {
            showToast('No speech or text found. Please speak or enter text first before translating.', 'error', 'Empty Input');
            return;
        }

        const sourceLang = inputLangSelect.value;
        const targetLang = targetLangSelect.value;

        // Show loading state
        placeholderTranslation.style.display = 'none';
        translationList.style.display = 'none';
        translationLoading.style.display = 'flex';
        translateBtn.disabled = true;

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    text: textToTranslate,
                    source_lang: sourceLang,
                    target_lang: targetLang
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                const errorMsg = data.error || `Translation request failed with status ${response.status}`;
                showToast(errorMsg, 'error', 'Translation Failed');
                translationLoading.style.display = 'none';
                if (translatedParagraphs.length === 0) {
                    placeholderTranslation.style.display = 'flex';
                } else {
                    translationList.style.display = 'flex';
                }
                return;
            }

            // Successfully received translated paragraphs
            translatedParagraphs = data.paragraphs || [data.translated_text];
            renderTranslation();
            updateTranslationStats();
            showToast(`Translated into ${data.target_name || targetLang} successfully!`, 'success');

        } catch (error) {
            console.error('Translation network/client error:', error);
            showToast('Network error: Unable to connect to the backend translation service. Ensure Flask server is running.', 'error', 'Server Unavailable');
            if (translatedParagraphs.length === 0) {
                placeholderTranslation.style.display = 'flex';
            }
        } finally {
            translationLoading.style.display = 'none';
            translateBtn.disabled = false;
        }
    }

    function renderTranslation() {
        if (translatedParagraphs.length === 0) {
            placeholderTranslation.style.display = 'flex';
            translationList.style.display = 'none';
            translationList.innerHTML = '';
            return;
        }

        placeholderTranslation.style.display = 'none';
        translationList.style.display = 'flex';
        translationList.innerHTML = '';

        translatedParagraphs.forEach((para, index) => {
            const pElement = document.createElement('div');
            pElement.className = 'paragraph-item';
            pElement.innerHTML = `
                <span class="paragraph-tag">¶ ${index + 1}</span>
                <span class="paragraph-text">${escapeHtml(para)}</span>
            `;
            translationList.appendChild(pElement);
        });

        translationContainer.scrollTop = translationContainer.scrollHeight;
    }

    function updateTranslationStats() {
        const fullText = translatedParagraphs.join(' ').trim();
        const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
        const chars = fullText.length;
        translationStats.textContent = `${words} words • ${chars} characters`;
    }

    // -------------------------------------------------------------------------
    // CLIPBOARD & TEXT-TO-SPEECH (TTS)
    // -------------------------------------------------------------------------
    function copyToClipboard(text, successMessage) {
        if (!text || !text.trim()) {
            showToast('Nothing to copy yet.', 'info');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => showToast(successMessage, 'success'))
                .catch(() => fallbackCopy(text, successMessage));
        } else {
            fallbackCopy(text, successMessage);
        }
    }

    function fallbackCopy(text, successMessage) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage, 'success');
        } catch (e) {
            showToast('Failed to copy to clipboard.', 'error');
        }
        document.body.removeChild(textarea);
    }

    function speakTranslatedText() {
        if (translatedParagraphs.length === 0) {
            showToast('No translated text to read.', 'info');
            return;
        }

        if (!('speechSynthesis' in window)) {
            showToast('Text-to-speech is not supported in your browser.', 'error');
            return;
        }

        window.speechSynthesis.cancel(); // Stop any active speech

        const fullText = translatedParagraphs.join('. ');
        const utterance = new SpeechSynthesisUtterance(fullText);

        // Map target language to voice code
        const targetOption = targetLangSelect.options[targetLangSelect.selectedIndex];
        const targetCode = targetOption.value;
        const voiceCodes = {
            en: 'en-US',
            hi: 'hi-IN',
            kn: 'kn-IN',
            ta: 'ta-IN',
            te: 'te-IN',
            ml: 'ml-IN',
            mr: 'mr-IN',
            bn: 'bn-IN',
            gu: 'gu-IN',
            es: 'es-ES'
        };

        utterance.lang = voiceCodes[targetCode] || targetCode;
        utterance.rate = 0.95;

        utterance.onstart = () => {
            speakTranslationBtn.classList.add('active');
        };
        utterance.onend = () => {
            speakTranslationBtn.classList.remove('active');
        };
        utterance.onerror = () => {
            speakTranslationBtn.classList.remove('active');
        };

        window.speechSynthesis.speak(utterance);
    }

    // -------------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------------
    startBtn.addEventListener('click', startListening);
    stopBtn.addEventListener('click', stopListening);
    clearBtn.addEventListener('click', clearAll);
    swapLanguagesBtn.addEventListener('click', swapLanguages);

    heroStartBtn.addEventListener('click', () => {
        document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' });
        startListening();
    });

    translateBtn.addEventListener('click', translateParagraphs);

    copyTranslationBtn.addEventListener('click', () => {
        copyToClipboard(translatedParagraphs.join('\n\n'), 'Translated paragraph copied to clipboard!');
    });

    copySpeechBtn.addEventListener('click', () => {
        copyToClipboard(recognizedParagraphs.join('\n\n'), 'Original speech copied to clipboard!');
    });

    speakTranslationBtn.addEventListener('click', speakTranslatedText);

    // Language select changes
    inputLangSelect.addEventListener('change', () => {
        updateLanguageLabels();
        updateRecognitionLanguage();
    });

    targetLangSelect.addEventListener('change', () => {
        updateLanguageLabels();
    });

    // View toggles: Paragraphs vs Raw Text
    viewParagraphsBtn.addEventListener('click', () => {
        viewParagraphsBtn.classList.add('active');
        viewRawBtn.classList.remove('active');
        paragraphsContainer.style.display = 'block';
        rawContainer.style.display = 'none';

        // Sync any manual edits made in the textarea back to recognized paragraphs
        const rawContent = rawSpeechTextarea.value.trim();
        if (rawContent) {
            recognizedParagraphs = rawContent.split(/\n+/).map(p => p.trim()).filter(Boolean);
            renderParagraphs();
            updateSpeechStats();
        }
    });

    viewRawBtn.addEventListener('click', () => {
        viewRawBtn.classList.add('active');
        viewParagraphsBtn.classList.remove('active');
        paragraphsContainer.style.display = 'none';
        rawContainer.style.display = 'block';
        updateRawTextarea();
    });

    // Raw textarea input sync
    rawSpeechTextarea.addEventListener('input', () => {
        const rawContent = rawSpeechTextarea.value.trim();
        if (rawContent) {
            recognizedParagraphs = rawContent.split(/\n+/).map(p => p.trim()).filter(Boolean);
        } else {
            recognizedParagraphs = [];
        }
        updateSpeechStats();
    });

    // -------------------------------------------------------------------------
    // TEST SAMPLE SPEECH SIMULATION (College Project Demo Backup)
    // -------------------------------------------------------------------------
    const DEMO_SPEECH_DATA = {
        en: [
            "Today I went to the market.",
            "I bought some fresh vegetables.",
            "Then I came back home and cooked lunch."
        ],
        hi: [
            "आज मैं बाजार गया था।",
            "मैंने कुछ ताजी सब्जियां खरीदीं।",
            "फिर मैं घर वापस आ गया।"
        ],
        kn: [
            "ಇಂದು ನಾನು ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗಿದ್ದೆ.",
            "ನಾನು ಕೆಲವು ತಾಜಾ ತರಕಾರಿಗಳನ್ನು ಖರೀದಿಸಿದೆ.",
            "ನಂತರ ನಾನು ಮನೆಗೆ ಹಿಂದಿರುಗಿದೆ."
        ],
        ta: [
            "இன்று நான் சந்தைக்குச் சென்றேன்.",
            "நான் சில புதிய காய்கறிகளை வாங்கினேன்.",
            "பின்னர் நான் வீட்டிற்குத் திரும்பினேன்."
        ],
        te: [
            "ఈరోజు నేను మార్కెట్‌కు వెళ్లాను.",
            "నేను కొన్ని తాజా కూరగాయలను కొన్నాను.",
            "తర్వాత ఇంటికి తిరిగి వచ్చాను."
        ],
        ml: [
            "ഇന്ന് ഞാൻ ചന്തയിൽ പോയി.",
            "ഞാൻ കുറച്ച് പച്ചക്കറികൾ വാങ്ങി.",
            "പിന്നെ ഞാൻ വീട്ടിൽ തിരിച്ചെത്തി."
        ],
        mr: [
            "आज मी बाजारात गेलो होतो.",
            "मी काही ताज्या भाज्या विकत घेतल्या.",
            "त्यानंतर मी घरी परतलो."
        ],
        bn: [
            "আজ আমি বাজারে গিয়েছিলাম।",
            "আমি কিছু টাটকা সবজি কিনেছি।",
            "তারপর আমি বাড়ি ফিরে এলাম।"
        ],
        gu: [
            "આજે હું બજારમાં ગયો હતો.",
            "મેં કેટલાક તાજા શાકભાજી ખરીદ્યા.",
            "પછી હું ઘરે પાછો આવ્યો."
        ],
        es: [
            "Hoy fui al mercado.",
            "Compré algunas verduras frescas.",
            "Luego regresé a casa y cociné el almuerzo."
        ]
    };

    function simulateSampleSpeech() {
        stopListening();
        setStatus('listening');
        const lang = inputLangSelect.value || 'en';
        const samplePhrases = DEMO_SPEECH_DATA[lang] || DEMO_SPEECH_DATA['en'];

        recognizedParagraphs = [];
        renderParagraphs();
        updateSpeechStats();

        let phraseIndex = 0;
        showToast('Simulating natural voice recognition...', 'info', 'Demo Speech');

        function insertNextPhrase() {
            if (phraseIndex < samplePhrases.length) {
                const phrase = samplePhrases[phraseIndex];
                interimText.textContent = phrase;
                interimPreview.style.display = 'flex';

                setTimeout(() => {
                    interimPreview.style.display = 'none';
                    recognizedParagraphs.push(phrase);
                    renderParagraphs();
                    updateRawTextarea();
                    updateSpeechStats();
                    phraseIndex++;
                    setTimeout(insertNextPhrase, 600);
                }, 750);
            } else {
                setStatus('ready');
                showToast('Speech recognized into paragraphs! Click [Translate] now.', 'success', 'Ready to Translate');
            }
        }

        setTimeout(insertNextPhrase, 300);
    }

    if (demoSpeechBtn) {
        demoSpeechBtn.addEventListener('click', simulateSampleSpeech);
    }

    // Troubleshoot Box Event Handlers
    if (closeTroubleshootBtn) {
        closeTroubleshootBtn.addEventListener('click', () => {
            if (networkTroubleshootBox) networkTroubleshootBox.style.display = 'none';
        });
    }

    if (troubleshootRetryBtn) {
        troubleshootRetryBtn.addEventListener('click', () => {
            if (networkTroubleshootBox) networkTroubleshootBox.style.display = 'none';
            networkRetryCount = 0;
            startListening();
        });
    }

    // Configure the localhost switch link dynamically based on current origin
    if (switchLocalhostLink) {
        const curHost = window.location.hostname;
        const curPort = window.location.port || '5000';
        if (curHost === '127.0.0.1') {
            switchLocalhostLink.href = `http://localhost:${curPort}/`;
            switchLocalhostLink.textContent = `👉 Click here to switch to http://localhost:${curPort}`;
        } else {
            switchLocalhostLink.href = `http://localhost:${curPort}/`;
            switchLocalhostLink.textContent = `👉 Currently on http://localhost:${curPort} (click to reload)`;
        }
    }

    // Initialize
    updateLanguageLabels();
    initSpeechRecognition();
    setStatus('ready');
});
