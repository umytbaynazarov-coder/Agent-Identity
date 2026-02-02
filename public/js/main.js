// API Configuration
const API_BASE = 'https://agentauth-production-b6b2.up.railway.app';

// Demo state
let demoState = {
    agentId: null,
    apiKey: null,
    accessToken: null
};

// Tab Switching
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSandboxTabs();
    initCopyButtons();
    initDemo();
    initMobileNav();
    initScrollEffects();
    initFeatureCardTracking();
});

// Tab functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update panels
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.getAttribute('data-panel') === targetTab) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Copy to clipboard
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetId = button.getAttribute('data-copy');
            const codeElement = document.getElementById(targetId);
            
            if (!codeElement) return;
            
            const textToCopy = codeElement.textContent;
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Visual feedback
                button.classList.add('copied');
                const originalHTML = button.innerHTML;
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                `;
                
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = originalHTML;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });
}

// Interactive Demo
function initDemo() {
    const registerBtn = document.getElementById('demo-register');
    const verifyBtn = document.getElementById('demo-verify');
    const fetchBtn = document.getElementById('demo-fetch');
    
    registerBtn.addEventListener('click', handleRegister);
    verifyBtn.addEventListener('click', handleVerify);
    fetchBtn.addEventListener('click', handleFetch);
}

async function handleRegister() {
    const btn = document.getElementById('demo-register');
    const output = document.getElementById('register-output');
    
    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Registering...';
    output.classList.add('visible');
    output.textContent = 'Sending request to API...';
    
    try {
        const response = await fetch(`${API_BASE}/v1/agents/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'DemoAgent',
                owner_email: 'demo@agentauth.dev',
                permissions: ['read', 'write']
            })
        });
        
        const data = await response.json();

        if (response.ok) {
            // Store credentials
            demoState.agentId = data.agent_id;
            demoState.apiKey = data.api_key;

            // Display result
            output.textContent = JSON.stringify(data, null, 2);

            // Enable next step
            document.getElementById('demo-verify').disabled = false;
            document.querySelector('[data-step="2"]').classList.add('active');

            // Update button
            btn.textContent = '✓ Agent Registered';
        } else {
            output.textContent = `Error: ${data.error || 'Registration failed'}`;
            btn.disabled = false;
            btn.textContent = 'Try Again';
        }
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

async function handleVerify() {
    const btn = document.getElementById('demo-verify');
    const output = document.getElementById('verify-output');
    
    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    output.classList.add('visible');
    output.textContent = 'Authenticating agent...';
    
    try {
        const response = await fetch(`${API_BASE}/v1/agents/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: demoState.agentId,
                api_key: demoState.apiKey
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Display result
            output.textContent = JSON.stringify(data, null, 2);

            // Enable next step
            document.getElementById('demo-fetch').disabled = false;
            document.querySelector('[data-step="3"]').classList.add('active');

            // Update button
            btn.textContent = '✓ Identity Verified';
        } else {
            output.textContent = `Error: ${data.error || 'Verification failed'}`;
            btn.disabled = false;
            btn.textContent = 'Try Again';
        }
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

async function handleFetch() {
    const btn = document.getElementById('demo-fetch');
    const output = document.getElementById('fetch-output');
    
    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Fetching...';
    output.classList.add('visible');
    output.textContent = 'Making authenticated request...';
    
    try {
        const response = await fetch(`${API_BASE}/v1/agents/${demoState.agentId}`, {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Display result
            output.textContent = JSON.stringify(data, null, 2);
            
            // Update button
            btn.textContent = '✓ Details Fetched';
            
            // Show success message
            setTimeout(() => {
                document.getElementById('demo-success').style.display = 'block';
            }, 500);
        } else {
            output.textContent = `Error: ${data.error || 'Fetch failed'}`;
            btn.disabled = false;
            btn.textContent = 'Try Again';
        }
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

// Mobile Navigation
function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (toggle) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}

// Scroll Effects
function initScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card, .update-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Sandbox Tab Switching
function initSandboxTabs() {
    const tabButtons = document.querySelectorAll('.sandbox-tab-btn');
    const tabPanels = document.querySelectorAll('.sandbox-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-sandbox');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.getAttribute('data-sandbox-panel') === target) {
                    panel.classList.add('active');
                }
            });

            trackEvent('Sandbox', 'tab_switch', target);
        });
    });
}

// GA Event Tracking
function trackEvent(category, action, label) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
}

// Track feature card clicks
function initFeatureCardTracking() {
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            const featureName = card.querySelector('h3')?.textContent || 'unknown';
            const featureId = card.getAttribute('data-feature') || featureName;
            trackEvent('Features', 'card_click', featureId);
        });
    });

    // Track CTA button clicks
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
        btn.addEventListener('click', () => {
            trackEvent('CTA', 'click', btn.textContent.trim());
        });
    });

    // Track sandbox copy events
    document.querySelectorAll('.sandbox-panel .copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-copy') || '';
            trackEvent('Sandbox', 'copy_code', targetId);
        });
    });
}