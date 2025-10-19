// Profile module using Firebase Auth for authentication but storing profile data locally (localStorage)
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyD9xj18_xpuEshxQcy6362QfaRHk4rq_5E",
  authDomain: "polypal-27b8c.firebaseapp.com",
  projectId: "polypal-27b8c",
  storageBucket: "polypal-27b8c.firebasestorage.app",
  messagingSenderId: "1082540681421",
  appId: "1:1082540681421:web:61a150f3bf06e72166a184",
  measurementId: "G-JFV9V4G7Q5"
};

let app;
if (!getApps().length) app = initializeApp(firebaseConfig); else app = getApps()[0];
const auth = getAuth(app);

// DOM
const profilePic = document.getElementById('profilePic');
const fileInput = document.getElementById('fileInput');
const usernameEl = document.getElementById('username');
const emailEl = document.getElementById('email');
const bioEl = document.getElementById('bio');
const websiteEl = document.getElementById('website');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const message = document.getElementById('message');

let uid = null;
let original = {};
let newAvatarDataUrl = null;

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? 'red' : 'green';
}

// Local DB helpers (store all users in one object under 'local_users')
function readLocalDB() {
  try {
    const raw = localStorage.getItem('local_users');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to read local DB', e);
    return {};
  }
}

function writeLocalDB(db) {
  try {
    localStorage.setItem('local_users', JSON.stringify(db));
    return true;
  } catch (e) {
    console.error('Failed to write local DB', e);
    return false;
  }
}

function loadLocalProfile(uid) {
  const db = readLocalDB();
  return db[uid] || null;
}

function saveLocalProfile(uid, data) {
  const db = readLocalDB();
  db[uid] = data;
  return writeLocalDB(db);
}

// Image selection: store as data URL in memory until saved
profilePic && profilePic.addEventListener('click', () => fileInput && fileInput.click());
fileInput && fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    profilePic.src = ev.target.result;
    newAvatarDataUrl = ev.target.result;
  };
  reader.readAsDataURL(f);
});

// Auth state — load local profile for signed-in user
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  uid = user.uid;

  // Try to load local profile
  const local = loadLocalProfile(uid);
  if (local) {
    original = local;
    if (usernameEl) usernameEl.value = local.username || user.displayName || '';
    if (emailEl) emailEl.value = local.email || user.email || '';
    if (bioEl) bioEl.value = local.bio || '';
    if (websiteEl) websiteEl.value = local.website || '';
    if (local.profilePicDataUrl && profilePic) profilePic.src = local.profilePicDataUrl;
    setMessage('Profile loaded from local database');
    return;
  }

  // If no local profile, initialize from auth info
  original = { username: user.displayName || '', email: user.email || '', bio: '', website: '', profilePicDataUrl: profilePic ? profilePic.src : '' };
  if (usernameEl) usernameEl.value = original.username;
  if (emailEl) emailEl.value = original.email;
  if (bioEl) bioEl.value = original.bio;
  if (websiteEl) websiteEl.value = original.website;
  saveLocalProfile(uid, original);
  setMessage('Profile initialized locally');
});

// Save to local DB
saveBtn && saveBtn.addEventListener('click', () => {
  if (!uid) return setMessage('Not authenticated', true);
  setMessage('Saving locally...');

  const profilePicData = newAvatarDataUrl || (profilePic ? profilePic.src : '') || '';
  const data = {
    username: usernameEl ? usernameEl.value : '',
    email: emailEl ? emailEl.value : '',
    bio: bioEl ? bioEl.value : '',
    website: websiteEl ? websiteEl.value : '',
    profilePicDataUrl: profilePicData,
    updatedAt: new Date().toISOString()
  };

  const ok = saveLocalProfile(uid, data);
  if (ok) {
    original = data;
    newAvatarDataUrl = null;
    setMessage('Profile saved locally');
  } else {
    setMessage('Failed to save locally', true);
  }
});

// Cancel
cancelBtn && cancelBtn.addEventListener('click', () => {
  if (!original) return;
  usernameEl.value = original.username || '';
  emailEl.value = original.email || '';
  bioEl.value = original.bio || '';
  websiteEl.value = original.website || '';
  if (original.profilePicDataUrl) profilePic.src = original.profilePicDataUrl;
  newAvatarDataUrl = null;
  setMessage('Changes canceled');
});

// Expose a small API for debugging (optional)
window._localProfileDB = {
  read: readLocalDB,
  write: writeLocalDB,
  loadProfile: loadLocalProfile,
  saveProfile: saveLocalProfile
};
