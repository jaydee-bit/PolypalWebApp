// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9xj18_xpuEshxQcy6362QfaRHk4rq_5E",
  authDomain: "polypal-27b8c.firebaseapp.com",
  projectId: "polypal-27b8c",
  storageBucket: "polypal-27b8c.firebasestorage.app",
  messagingSenderId: "1082540681421",
  appId: "1:1082540681421:web:61a150f3bf06e72166a184",
  measurementId: "G-JFV9V4G7Q5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ========== AUTHENTICATION FUNCTIONS ==========

// Login function - now with Firebase
async function login() {
    const email = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const errorDiv = document.getElementById("error-message");

    if (email !== "" && pass !== "") {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            
            // Success! Redirect to getstarted page
            window.location.href = "getstarted.html";
        } catch (error) {
            // Show error message
            let errorMessage = 'Invalid email or password';
            
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Check your connection.';
            }
            
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
            } else {
                alert(errorMessage);
            }
        }
    } else {
        if (errorDiv) {
            errorDiv.textContent = 'Please enter both email and password';
        }
    }
}

// Signup function - now with Firebase
async function signup() {
    const email = document.getElementById("email-signup")?.value || "";
    const pass = document.getElementById("password").value;
    const confpass = document.getElementById("confirmpass").value;
    const errorDiv = document.getElementById("error-message");

    // Validation
    if (email === "" || pass === "" || confpass === "") {
        if (errorDiv) {
            errorDiv.textContent = 'Please fill in all fields';
        }
        return;
    }

    if (pass !== confpass) {
        if (errorDiv) {
            errorDiv.textContent = 'Passwords do not match';
        }
        return;
    }

    if (pass.length < 8) {
        if (errorDiv) {
            errorDiv.textContent = 'Password must be at least 8 characters';
        }
        return;
    }

    try {
        // Create user with Firebase using the provided email
        await createUserWithEmailAndPassword(auth, email, pass);
        
        // Success! Redirect to getstarted page
        window.location.href = "getstarted.html";
    } catch (error) {
        let errorMessage = 'Failed to create account';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format';
        }
        
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
        } else {
            alert(errorMessage);
        }
    }
}

// Logout function - now with Firebase
async function logout() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if logout fails
        window.location.href = "login.html";
    }
}

// Forgot Password function
async function forgotPassword() {
    const raw = document.getElementById("reset-username").value.trim();
    const errorDiv = document.getElementById("error-message");
    const successDiv = document.getElementById("success-message");
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!raw) {
        if (errorDiv) errorDiv.textContent = 'Please enter your email';
        return;
    }

    // Determine whether the user provided a full email or just a username
    let email = raw;
    if (!raw.includes('@')) {
        // treat as username and append the app domain
        email = raw + '@polypal.app';
    } else {
        // basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (errorDiv) errorDiv.textContent = 'Invalid email format';
            return;
        }
    }

    // Clear messages
    if (errorDiv) errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = '';

    // Show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }

    try {
        await sendPasswordResetEmail(auth, email);
        
        // Success message
        if (successDiv) {
            successDiv.textContent = 'Password reset email sent! Check your inbox.';
        }
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        let errorMessage = 'Failed to send reset email';
        
        if (error && error.code === 'auth/user-not-found') {
            errorMessage = 'Email not found';
        } else if (error && error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format';
        } else if (error && error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
        }
        
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
        } else {
            alert(errorMessage);
        }
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Email';
        }
    }
}

// Check if user is logged in (protect pages)
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        const currentPage = window.location.pathname;
        const publicPages = ['login.html', 'signup.html', 'index.html', 'forgot-password.html'];
        const isPublicPage = publicPages.some(page => currentPage.includes(page));

        if (!user && !isPublicPage) {
            // User not logged in, redirect to login
            window.location.href = "login.html";
        } else if (user && (currentPage.includes('login.html') || currentPage.includes('signup.html'))) {
            // User already logged in, redirect to home
            window.location.href = "home.html";
        }
    });
}

// Call checkAuth on page load
checkAuth();

// ========== EVENT LISTENERS FOR LOGIN/SIGNUP ==========

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Login form listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }

    // Signup form listener
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signup();
        });
    }

    // Forgot password form listener
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            forgotPassword();
        });
    }
});

// ========== NAVIGATION FUNCTIONS ==========

function next1() {
    const selected = document.querySelector('input[name="language"]:checked');

    if (selected) {
        // Just navigate directly - the switch statement was breaking it
        location.href = "selectregion.html";
    } else {
        alert("Please select a language before continuing!");
    }
}

function next2() {
    const selected = document.querySelector('input[name="region"]:checked');
    const reminder = document.getElementById("reminder");

    if (selected) {
        switch (selected.value) {
            case "Philippines":
            case "United-States":
            case "China":
            case "Brazil":
            case "India":
                location.href = "home.html";
                break;
            default:
                if (reminder) {
                    reminder.textContent = "Please select a region before continuing!";
                }
        }
    } else {
        if (reminder) {
            reminder.textContent = "Please select a region before continuing!";
        }
    }
}

function next3() {
    const selected = document.querySelector('input[name="language"]:checked');
    const reminder = document.getElementById("reminder");

    if (selected) {
        switch (selected.value) {
            case "English":
                location.href = "matchword.html";
                break;
            case "Spanish":
                location.href = "matchwordspanish.html";
                break;
            case "Chinese":
                location.href = "matchwordchinese.html";
                break;
            case "French":
                location.href = "matchwordfrench.html";
                break;
            default:
                if (reminder) {
                    reminder.textContent = "Please select a language before continuing!";
                }
        }
    } else {
        if (reminder) {
            reminder.textContent = "Please select a language before continuing!";
        }
    }
}

function next4() {
    const selected = document.querySelector('input[name="language"]:checked');
    const reminder = document.getElementById("reminder");

    if (selected) {
        switch (selected.value) {
            case "English":
                location.href = "flashcard.html";
                break;
            case "Spanish":
                location.href = "flashcardspanish.html";
                break;
            case "Chinese":
                location.href = "flashcardchinese.html";
                break;
            case "French":
                location.href = "flashcardfrench.html";
                break;
            default:
                if (reminder) {
                    reminder.textContent = "Please select a language before continuing!";
                }
        }
    } else {
        if (reminder) {
            reminder.textContent = "Please select a language before continuing!";
        }
    }
}

// ========== GAME/ACTIVITY NAVIGATION ==========

function toChat() {
    location.href = "chats.html";
}

function play1() { // word match
    location.href = "selectlanguagetolearnformatchword.html";
}

function play2() { // for flashcards
    location.href = "selectlanguagetolearnforflashcards.html";
}

function play3() { // for pronunciation practice
    location.href = "pronounciation.html";
}

function toProfile() {
    location.href = "profile.html";
}

// ========== GAME FEEDBACK ==========

function correctAns(btn) {
    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Correct!";
        result.style.color = "rgb(6, 182, 6)";
    }

    // Visual feedback
    if (btn) {
        btn.style.backgroundColor = 'rgb(6, 182, 6)';
    }

    // After a short delay navigate to next page or load next question
    setTimeout(() => {
        // Here we navigate to home for demo; change destination as needed
        // window.location.href = 'home.html';
        // For now try loading next question page if exists
        // Attempt to go to next matchword page if present
        // If no next page, clear result
        if (document.location.pathname.includes('matchword.html')) {
            // Example: stay on same page but clear highlight and result
            if (btn) btn.style.backgroundColor = '';
            if (result) result.textContent = '';
        }
    }, 800);
}

function wrongAns(btn) {
    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Wrong!";
        result.style.color = "red";
    }

    // Visual feedback: highlight selected in red and correct in green
    if (btn) {
        btn.style.backgroundColor = 'red';
    }
    const correctBtn = document.querySelector('[data-correct="true"]');
    if (correctBtn) {
        correctBtn.style.backgroundColor = 'rgb(6, 182, 6)';
    }

    setTimeout(() => {
        // Remove highlights after delay
        if (btn) btn.style.backgroundColor = '';
        if (correctBtn) correctBtn.style.backgroundColor = '';
        if (result) result.textContent = '';
    }, 1200);
}

// ========== FLASHCARD FUNCTIONALITY ==========

// Select all flashcards
const flashcards = document.querySelectorAll('.flashcard');

// Add click event for each card
flashcards.forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });
});

// ========== MAKE FUNCTIONS GLOBALLY ACCESSIBLE ==========
// This is needed because HTML onclick attributes need global functions
window.login = login;
window.signup = signup;
window.logout = logout;
window.forgotPassword = forgotPassword;
window.next1 = next1;
window.next2 = next2;
window.next3 = next3;
window.next4 = next4;
window.toChat = toChat;
window.play1 = play1;
window.play2 = play2;
window.play3 = play3;
window.toProfile = toProfile;
window.correctAns = correctAns;
window.wrongAns = wrongAns;