import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const darkIconHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>`;
const lightIconHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

function setTheme(theme) {
    const themeToggleBtns = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleBtns.forEach(btn => { if (btn) btn.innerHTML = lightIconHTML; });
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleBtns.forEach(btn => { if (btn) btn.innerHTML = darkIconHTML; });
        localStorage.setItem('theme', 'light');
    }
}

function handleThemeToggle() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
}

function updateNavbar(user) {
    const navDesktop = document.getElementById('nav-desktop');
    if (!navDesktop) return;

    if (user) {
        navDesktop.innerHTML = `
            <a href="events.html" class="nav-link text-gray-900 dark:text-gray-100 font-medium">Events</a>
            <a href="dashboard.html" class="nav-link text-gray-900 dark:text-gray-100 font-medium">Dashboard</a>
            <a href="profile.html" class="nav-link text-gray-900 dark:text-gray-100 font-medium">Profile</a>
            <button id="logout-btn-nav" class="bg-red-500 text-white px-6 py-2.5 rounded-xl hover:bg-red-600 transition-colors font-semibold">Logout</button>
            <button id="theme-toggle" class="p-3 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"></button>
        `;
    } else {
        navDesktop.innerHTML = `
            <a href="index.html" class="nav-link text-gray-900 dark:text-gray-100 font-medium">Home</a>
            <a href="events.html" class="nav-link text-gray-900 dark:text-gray-100 font-medium">Events</a>
            <a href="login.html" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"><i class="fa-solid fa-lock mr-2"></i>Login</a>
            <button id="theme-toggle" class="p-3 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"></button>
        `;
    }
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    setTheme(currentTheme);
}

onAuthStateChanged(auth, (user) => {
    updateNavbar(user);
});

document.addEventListener('click', (e) => {
    if (e.target.closest('#logout-btn-nav')) {
        signOut(auth).catch((error) => console.error("Sign out error:", error));
    }
    if (e.target.closest('#theme-toggle') || e.target.closest('#theme-toggle-mobile')) {
        handleThemeToggle();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu');
    if (mobileMenu && mobileMenuBtn && closeMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('open'));
        closeMenuBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));
    }

    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('sticky-nav', window.scrollY > 50);
        });
    }
});