// Get references to DOM elements for chat functionality
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendButton = document.getElementById('sendButton');
const micButton = document.getElementById('micButton');
let isRecording = false; // Track recording state
let mediaRecorder = null; // MediaRecorder instance
let audioChunks = [];
let activeStream = null;
let recognition = null; // SpeechRecognition for live transcription of voice messages
let recordedTranscript = '';
let currentFriend = null; // id/name of selected friend

// LocalStorage message DB helpers
function conversationKey(friendId) {
    return 'polypal_messages_' + encodeURIComponent(friendId);
}

function loadMessagesFromStorage(friendId) {
    try {
        const raw = localStorage.getItem(conversationKey(friendId));
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load messages from storage', e);
        return [];
    }
}

function saveMessagesToStorage(friendId, messages) {
    try {
        localStorage.setItem(conversationKey(friendId), JSON.stringify(messages));
    } catch (e) {
        console.error('Failed to save messages to storage', e);
    }
}

function appendMessageToStorage(friendId, messageObj) {
    if (!friendId) return;
    const messages = loadMessagesFromStorage(friendId);
    messages.push(messageObj);
    saveMessagesToStorage(friendId, messages);
}

// Helper converts an audio Blob to dataURL and then calls callback
function blobToDataURL(blob, cb) {
    const reader = new FileReader();
    reader.onload = function() { cb(reader.result); };
    reader.onerror = function(err) { console.error('Failed to convert blob to dataURL', err); cb(null); };
    reader.readAsDataURL(blob);
}

/**
 * ADD MESSAGE (supports text or audio)
 */
function addMessage(content, sender, persist = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';

    const body = document.createElement('div');
    body.className = 'text';

    if (typeof content === 'string') {
        body.textContent = content;
    } else if (content && content.type === 'audio') {
        // For audio, content.url should be a data URL (persistent) or object URL (temporary)
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = content.url;
        audio.preload = 'none';
        audio.style.maxWidth = '320px';
        audio.style.borderRadius = '8px';
        audio.style.background = '#fff';
        body.appendChild(audio);

        if (content.duration) {
            const meta = document.createElement('div');
            meta.className = 'audio-meta';
            meta.textContent = `${Math.round(content.duration/1000)}s`;
            meta.style.fontSize = '12px';
            meta.style.color = '#666';
            meta.style.marginTop = '6px';
            body.appendChild(meta);
        }
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(body);
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;

    // Persist message to localStorage database when appropriate
    try {
        if (persist && currentFriend && sender !== 'system') {
            // Build a serializable message object
            const msgObj = { sender, type: (typeof content === 'string') ? 'text' : content.type || 'audio', timestamp: Date.now() };
            if (msgObj.type === 'text') {
                msgObj.text = content;
                appendMessageToStorage(currentFriend, msgObj);
            } else if (msgObj.type === 'audio') {
                // content.url might be an object URL or data URL; prefer data URL for storage
                if (content.url && content.url.startsWith('data:')) {
                    msgObj.dataUrl = content.url;
                    appendMessageToStorage(currentFriend, msgObj);
                } else if (content.blob) {
                    // convert blob to dataURL then save
                    blobToDataURL(content.blob, (dataUrl) => {
                        if (dataUrl) {
                            msgObj.dataUrl = dataUrl;
                            appendMessageToStorage(currentFriend, msgObj);
                        } else {
                            console.warn('Could not persist audio message for', currentFriend);
                        }
                    });
                } else {
                    // fallback: store the url as-is (may not persist across reloads)
                    msgObj.dataUrl = content.url;
                    appendMessageToStorage(currentFriend, msgObj);
                }
            }
        }
    } catch (e) {
        console.error('Failed to persist message', e);
    }
}

/**
 * SEND MESSAGE (text)
 */
function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    if (containsBadWords(message)) {
        // show a system message instead of sending
        addMessage('Message blocked: contains prohibited language.', 'system');
        // Optionally keep masked version in input for user to edit
        input.value = maskBadWords(message);
        input.focus();
        return;
    }

    // proceed normally
    addMessage(message, 'user');
    input.value = '';
    setTimeout(() => addMessage('Thanks for your message!', 'bot'), 1000);
}

/**
 * START AUDIO RECORDING using MediaRecorder
 */
async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Audio recording is not supported in this browser. Try Chrome or Edge.');
        return;
    }

    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Choose best supported mimeType
        let options = {};
        try {
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    options = { mimeType: 'audio/webm;codecs=opus' };
                } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                    options = { mimeType: 'audio/ogg;codecs=opus' };
                }
            }
        } catch (mimeErr) {
            console.warn('mime detection failed', mimeErr);
        }

        mediaRecorder = new MediaRecorder(activeStream, options);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data && event.data.size > 0) audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
            try {
                const blob = new Blob(audioChunks, { type: options.mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const duration = null; // we can measure duration by playing the blob if needed

                addMessage({ type: 'audio', url, blob, duration }, 'user');
            } catch (err) {
                console.error('Error creating audio blob', err);
                addMessage('Voice message failed to record properly.', 'system');
            }

            // release tracks
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
                activeStream = null;
            }

            mediaRecorder = null;
            audioChunks = [];
        });

        mediaRecorder.start();
        isRecording = true;
        if (micButton) {
            micButton.classList.add('recording');
            micButton.innerHTML = '<i class="fas fa-stop"></i>';
            micButton.title = 'Stop recording';
        }
    } catch (err) {
        console.error('Could not start audio recording:', err);
        alert('Could not access microphone. Please allow microphone permissions.');
        if (activeStream) {
            activeStream.getTracks().forEach(t => t.stop());
            activeStream = null;
        }
    }
}

/**
 * STOP AUDIO RECORDING
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
            mediaRecorder.stop();
        } catch (e) {
            console.warn('Error stopping recorder', e);
        }
    }

    // cleanup UI even if recorder was null
    isRecording = false;
    micButton.classList.remove('recording');
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    micButton.title = 'Start voice recording';

    // If permission granted but we didn't create mediaRecorder, stop any stream
    if (activeStream && !mediaRecorder) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
    }
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

// Defensive event listener attachments
try {
    if (sendButton) sendButton.addEventListener('click', sendMessage);
} catch (e) {
    console.error('Failed to attach sendButton listener', e);
}
try {
    if (micButton) micButton.addEventListener('click', toggleRecording);
} catch (e) {
    console.error('Failed to attach micButton listener', e);
}
try {
    if (input) input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
} catch (e) {
    console.error('Failed to attach input listener', e);
}

// FRIEND SELECTION: only attach if items exist
const friendItems = document.querySelectorAll('.friend-item'); // Get all friend items
if (friendItems && friendItems.length) {
    friendItems.forEach(item => {
        item.addEventListener('click', function() {
            friendItems.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            const friendName = this.querySelector('.friend-name').textContent;
            const titleEl = document.querySelector('.title');
            if (titleEl) titleEl.textContent = friendName;
            if (chat) chat.innerHTML = '';

            // set current friend and load messages
            currentFriend = friendName;
            const messages = loadMessagesFromStorage(currentFriend);
            messages.forEach(m => {
                if (m.type === 'text') {
                    addMessage(m.text, m.sender, false);
                } else if (m.type === 'audio') {
                    const content = { type: 'audio', url: m.dataUrl || m.url };
                    addMessage(content, m.sender, false);
                }
            });
        });
    });
}

// SEARCH FUNCTIONALITY
const searchInput = document.getElementById('search');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        friendItems.forEach(item => {
            const nameEl = item.querySelector('.friend-name');
            const friendName = nameEl ? nameEl.textContent.toLowerCase() : '';
            item.style.display = friendName.includes(searchTerm) ? 'flex' : 'none';
        });
    });
}

// Simple profanity filter
const bannedWords = [
    'badword',
    'anotherbadword',
    'offensiveword'
];

function containsBadWords(text) {
    if (!text) return false;
    const lowered = text.toLowerCase();
    for (const word of bannedWords) {
        const re = new RegExp('\\b' + word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
        if (re.test(lowered)) return true;
    }
    return false;
}

function maskBadWords(text) {
    let out = text;
    for (const word of bannedWords) {
        const re = new RegExp('\\b' + word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
        out = out.replace(re, (m) => '*'.repeat(m.length));
    }
    return out;
}