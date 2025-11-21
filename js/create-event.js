
const api = {
    baseUrl: '/api/dashboard',
    async post(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

const eventForm = document.getElementById('create-event-form');
const submitButton = document.getElementById('submit-button');

// A reusable notification function (like in dashboard.js)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: 'var(--plasma-gradient)',
        error: 'linear-gradient(135deg, #FF006E, #DC2626)',
        info: 'var(--aurora-gradient)'
    };
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${colors[type]}; color: var(--pure-white); padding: 1rem 1.5rem; border-radius: 16px; box-shadow: var(--shadow-deep); z-index: 10001; font-weight: 600; transform: translateX(120%); transition: transform 0.3s var(--ease-cyber);`;
    notification.textContent = message;
    document.body.appendChild(notification);
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.innerHTML = 'Publishing...';

    const eventName = document.getElementById('event-name').value;
    const eventImage = document.getElementById('event-image').value;
    const eventDate = document.getElementById('event-date').value;
    const eventTime = document.getElementById('event-time').value;
    const eventLocation = document.getElementById('event-location').value;
    const eventCategory = document.getElementById('event-category').value;
    const eventDescription = document.getElementById('event-description').value;
    
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);

    try {
        await api.post('/events', {
            title: eventName,
            imageUrl: eventImage,
            date: eventDateTime.toISOString(),
            location: eventLocation,
            category: eventCategory,
            description: eventDescription,
            status: 'Upcoming' // Set initial status
        });
        
        showNotification('Event created successfully!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);

    } catch (error) {
        console.error("Error adding document: ", error);
        showNotification(`Error: ${error.message}`, 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = '🚀 Publish Event';
    }
});
