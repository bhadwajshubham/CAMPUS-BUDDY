const mockEvents = [
    { name: 'AI in Modern Business', category: 'Tech', date: '2024-10-20', time: '10:00 AM', location: 'Online', image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=878&q=80' },
    { name: 'Digital Art & NFT Workshop', category: 'Arts & Culture', date: '2024-11-05', time: '2:00 PM', location: 'Creative Hub', image: 'https://images.unsplash.com/photo-1607798748738-b15c40d339d9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80' },
    { name: 'University Football Championship', category: 'Sports', date: '2024-11-12', time: '5:00 PM', location: 'Main Stadium', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=735&q=80' },
    { name: 'Quantum Computing Seminar', category: 'Tech', date: '2024-11-18', time: '11:00 AM', location: 'Physics Hall', image: 'https://images.unsplash.com/photo-1617802690992-09d349939311?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80' },
    { name: 'Indie Film Festival', category: 'Arts & Culture', date: '2024-11-25', time: '7:00 PM', location: 'Indie Cinema', image: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80' },
    { name: 'Inter-College Basketball Tournament', category: 'Sports', date: '2024-12-02', time: '3:00 PM', location: 'Sports Complex', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80' },
];

const eventsGrid = document.getElementById('events-grid');
const searchBar = document.getElementById('search-bar');
const filterButtons = document.querySelectorAll('.filter-btn');

function displayEvents(events) {
    eventsGrid.innerHTML = '';
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.innerHTML = `
            <div class="event-image" style="background-image: url(${event.image})"></div>
            <div class="event-content">
                <div class="event-category">${event.category}</div>
                <h3 class="event-name">${event.name}</h3>
                <div class="event-details">
                    <span><i class="fa-solid fa-calendar"></i> ${event.date}</span>
                    <span><i class="fa-solid fa-clock"></i> ${event.time}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${event.location}</span>
                </div>
                <button class="register-btn">Register Now</button>
            </div>
        `;
        eventsGrid.appendChild(eventCard);
    });
}

function filterEvents() {
    const searchTerm = searchBar.value.toLowerCase();
    const activeCategory = document.querySelector('.filter-btn.active').dataset.category;

    const filteredEvents = mockEvents.filter(event => {
        const matchesCategory = activeCategory === 'All Events' || event.category === activeCategory;
        const matchesSearch = event.name.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    displayEvents(filteredEvents);
}

searchBar.addEventListener('input', filterEvents);

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        filterEvents();
    });
});

displayEvents(mockEvents);