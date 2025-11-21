
const api = {
    baseUrl: '/api/dashboard',
    async get(endpoint) {
        const response = await fetch(this.baseUrl + endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },
    async put(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

const eventForm = document.getElementById('edit-event-form');
const submitButton = document.getElementById('submit-button');
const eventId = new URLSearchParams(window.location.search).get('id');

// A reusable notification function
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

async function populateForm() {
    if (!eventId) {
        showNotification("No event ID provided.", "error");
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        return;
    }

    try {
        const eventData = await api.get(`/events/${eventId}`);
        
        // Populate the form
        document.getElementById('event-name').value = eventData.title;
        document.getElementById('event-image').value = eventData.imageUrl;
        const eventDate = new Date(eventData.date);
        document.getElementById('event-date').value = eventDate.toISOString().split('T')[0];
        document.getElementById('event-time').value = eventDate.toTimeString().split(' ')[0];
        document.getElementById('event-location').value = eventData.location;
        document.getElementById('event-category').value = eventData.category;
        document.getElementById('event-description').value = eventData.description;
    } catch (error) {
        showNotification("Event not found.", "error");
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
    }
}

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.innerHTML = 'Updating...';

    const eventName = document.getElementById('event-name').value;
    const eventImage = document.getElementById('event-image').value;
    const eventDate = document.getElementById('event-date').value;
    const eventTime = document.getElementById('event-time').value;
    const eventLocation = document.getElementById('event-location').value;
    const eventCategory = document.getElementById('event-category').value;
    const eventDescription = document.getElementById('event-description').value;
    
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);

    try {
        await api.put(`/events/${eventId}`, {
            title: eventName,
            imageUrl: eventImage,
            date: eventDateTime.toISOString(),
            location: eventLocation,
            category: eventCategory,
            description: eventDescription,
        });
        
        showNotification('Event updated successfully!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);

    } catch (error) {
        console.error("Error updating document: ", error);
        showNotification(`Error: ${error.message}`, 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = '💾 Update Event';
    }
});

populateForm();
