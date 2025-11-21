// Advanced Cursor System
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function updateCursor() {
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    cursorFollower.style.left = followerX + 'px';
    cursorFollower.style.top = followerY + 'px';
    
    requestAnimationFrame(updateCursor);
}
updateCursor();

// Enhanced hover effects
document.querySelectorAll('.btn, .feature-card, .event-card, .testimonial-card, .workflow-step, .stat-card').forEach(element => {
    element.addEventListener('mouseenter', function() {
        cursor.classList.add('hover');
    });
    
    element.addEventListener('mouseleave', function() {
        cursor.classList.remove('hover');
    });
});

// Magnetic Navigation
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// THEME TOGGLE (works across pages)
const themeButton = document.querySelector('.theme-toggle');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeButton) {
        themeButton.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i> Theme'
            : '<i class="fas fa-moon"></i> Theme';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Apply saved theme on load
    const saved = localStorage.getItem('theme') || 'light';
    applyTheme(saved);

    // Toggle theme on click
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
});

// Advanced Scroll Reveal System
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
});

// Enhanced Counter Animation
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 3000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Format large numbers
        let displayValue = Math.floor(current);
        if (displayValue >= 1000000) {
            displayValue = (displayValue / 1000000).toFixed(1) + 'M';
        } else if (displayValue >= 1000) {
            displayValue = (displayValue / 1000).toFixed(0) + 'K';
        }
        
        element.textContent = displayValue;
    }, 16);
}

// Start counters when visible
const statsObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('[data-count]');
            counters.forEach(counter => {
                if (!counter.classList.contains('animated')) {
                    counter.classList.add('animated');
                    animateCounter(counter);
                }
            });
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stats-section, .hero-stats').forEach(section => {
    statsObserver.observe(section);
});

// Smooth scrolling with easing
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Interactive Dashboard Cards
const dashboardItems = document.querySelectorAll('.card-item');
dashboardItems.forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        dashboardItems.forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        this.classList.add('active');
        
        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(102, 126, 234, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (rect.width / 2 - size / 2) + 'px';
        ripple.style.top = (rect.height / 2 - size / 2) + 'px';
        
        this.style.position = 'relative';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .card-item.active {
        background: var(--primary-gradient) !important;
        color: white !important;
        transform: translateX(10px);
    }
`;
document.head.appendChild(style);

// Parallax effects for floating elements
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.floating-element');
    
    parallaxElements.forEach((element, index) => {
        const speed = 0.3 + (index * 0.1);
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
    });
});

// Enhanced loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Interactive nav dots
const navDots = document.querySelectorAll('.nav-dot');
navDots.forEach((dot, index) => {
    dot.addEventListener('click', function() {
        navDots.forEach(d => d.classList.remove('active'));
        this.classList.add('active');
        
        // Simulate dashboard view change
        const cards = document.querySelectorAll('.content-card');
        cards.forEach(card => {
            card.style.transform = 'scale(0.95)';
            card.style.opacity = '0.7';
        });
        
        setTimeout(() => {
            cards.forEach(card => {
                card.style.transform = 'scale(1)';
                card.style.opacity = '1';
            });
        }, 300);
    });
});

// Performance optimization
let ticking = false;
function updateOnScroll() {
    // Batch scroll-based updates here
    if (!ticking) {
        requestAnimationFrame(() => {
            // Scroll-based animations
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', updateOnScroll);