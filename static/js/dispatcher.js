document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const addTripBtn = document.getElementById('add-trip-btn');
    const addDriverBtn = document.getElementById('add-driver-btn');
    const addPassengerBtn = document.getElementById('add-passenger-btn');
    const mapContainer = document.getElementById('map');
    const statusFilter = document.getElementById('status-filter');
    const dateRangeFilter = document.getElementById('date-range-filter');
    const driverFilter = document.getElementById('driver-filter');
    const passengerFilter = document.getElementById('passenger-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const filteredTripsList = document.getElementById('filtered-trips-list');
    const tripList = document.getElementById('trip-list');
    const socket = io();

    let map;
    let markers = [];

    // Initialize the map
    function initMap() {
        if (map) return;
        map = L.map('map').setView([37.7749, -122.4194], 10);  // Example: San Francisco
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
    }

    initMap();

    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('expanded');
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 300);
    });

    // Handle window resize for map adjustment
    window.addEventListener('resize', function() {
        if (map) {
            map.invalidateSize();
        }
    });

    // Open pop-up forms
    addTripBtn.addEventListener('click', function() {
        openPopupForm('add-trip-form');
    });

    addDriverBtn.addEventListener('click', function() {
        openPopupForm('add-driver-form');
    });

    addPassengerBtn.addEventListener('click', function() {
        openPopupForm('add-passenger-form');
    });

    // Close pop-up forms
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closePopupForm(this.closest('.popup-form').id);
        });
    });

    // Submit pop-up forms
    document.getElementById('trip-form').addEventListener('submit', submitTripForm);
    document.getElementById('driver-form').addEventListener('submit', submitDriverForm);
    document.getElementById('passenger-form').addEventListener('submit', submitPassengerForm);

    // Filter functions
    applyFiltersBtn.addEventListener('click', function() {
        fetchFilteredTrips();
    });

    resetFiltersBtn.addEventListener('click', function() {
        statusFilter.value = 'All';
        dateRangeFilter.value = 'all';
        driverFilter.value = 'all';
        passengerFilter.value = 'all';
        fetchFilteredTrips();
    });

    function fetchFilteredTrips() {
        const status = statusFilter.value;
        const dateRange = dateRangeFilter.value;
        const driver = driverFilter.value;
        const passenger = passengerFilter.value;

        fetch(`/get_filtered_trips?status=${status}&date_range=${dateRange}&driver=${driver}&passenger=${passenger}`)
            .then(response => response.json())
            .then(trips => {
                updateFilteredTripsList(trips);
                updateAllTripsList(trips);
                updateMapMarkers(trips);
            })
            .catch(error => console.error('Error fetching filtered trips:', error));
    }

    function updateFilteredTripsList(trips) {
        filteredTripsList.innerHTML = '';
        trips.forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.classList.add('filtered-trip-item');
            tripElement.innerHTML = `
                <p><strong>ID:</strong> ${trip.id}</p>
                <p><strong>Patient:</strong> ${trip.patient_name}</p>
                <p><strong>Status:</strong> ${trip.status}</p>
                <p><strong>Driver:</strong> ${trip.driver}</p>
            `;
            filteredTripsList.appendChild(tripElement);
        });
    }

    function updateAllTripsList(trips) {
        tripList.innerHTML = '';
        trips.forEach(trip => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${trip.id}</td>
                <td>${trip.patient_name}</td>
                <td>${trip.pickup_location}</td>
                <td>${trip.dropoff_location}</td>
                <td>${trip.status}</td>
                <td>${trip.driver}</td>
                <td>
                    <button class="edit-trip-btn" data-trip-id="${trip.id}">Edit</button>
                    <button class="delete-trip-btn" data-trip-id="${trip.id}">Delete</button>
                </td>
            `;
            tripList.appendChild(row);
        });
    }

    function updateMapMarkers(trips) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        trips.forEach(trip => {
            if (trip.pickup_lat && trip.pickup_lon) {
                const marker = L.marker([trip.pickup_lat, trip.pickup_lon]).addTo(map);
                marker.bindPopup(`<b>${trip.patient_name}</b><br>Pickup: ${trip.pickup_location}`);
                markers.push(marker);
            }
            if (trip.dropoff_lat && trip.dropoff_lon) {
                const marker = L.marker([trip.dropoff_lat, trip.dropoff_lon]).addTo(map);
                marker.bindPopup(`<b>${trip.patient_name}</b><br>Dropoff: ${trip.dropoff_location}`);
                markers.push(marker);
            }
        });

        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    function openPopupForm(formId) {
        document.getElementById(formId).classList.remove('hidden');
        document.body.insertAdjacentHTML('beforeend', '<div class="overlay"></div>');
    }

    function closePopupForm(formId) {
        document.getElementById(formId).classList.add('hidden');
        document.querySelector('.overlay').remove();
    }

    function submitTripForm(event) {
        event.preventDefault();
        // Add logic to submit trip form data
        closePopupForm('add-trip-form');
    }

    function submitDriverForm(event) {
        event.preventDefault();
        // Add logic to submit driver form data
        closePopupForm('add-driver-form');
    }

    function submitPassengerForm(event) {
        event.preventDefault();
        // Add logic to submit passenger form data
        closePopupForm('add-passenger-form');
    }

    // Socket.io event listeners
    socket.on('connect', function() {
        socket.emit('join', {room: 'dispatchers'});
    });

    socket.on('new_trip', function(data) {
        // Handle new trip event
        fetchFilteredTrips();
    });

    socket.on('trip_assigned', function(data) {
        // Handle trip assigned event
        fetchFilteredTrips();
    });

    socket.on('trip_started', function(data) {
        // Handle trip started event
        fetchFilteredTrips();
    });

    socket.on('trip_completed', function(data) {
        // Handle trip completed event
        fetchFilteredTrips();
    });
});
