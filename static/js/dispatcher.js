document.addEventListener('DOMContentLoaded', function() {
    const statusFilter = document.getElementById('status-filter');
    const dateRangeFilter = document.getElementById('date-range-filter');
    const driverFilter = document.getElementById('driver-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const filteredTripsList = document.getElementById('filtered-trips-list');
    const tripList = document.getElementById('trip-list');
    const addTripBtn = document.getElementById('add-trip-btn');
    const addDriverBtn = document.getElementById('add-driver-btn');
    const addPassengerBtn = document.getElementById('add-passenger-btn');
    const addTripForm = document.getElementById('add-trip-form');
    const addDriverForm = document.getElementById('add-driver-form');
    const addPassengerForm = document.getElementById('add-passenger-form');
    const closeBtns = document.querySelectorAll('.close-btn');
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const socket = io();
    
    let map;
    let markers = [];

    function initMap() {
        if (map) return;  // If map already exists, don't initialize again
        console.log('Initializing map...');
        map = L.map('map').setView([37.7749, -122.4194], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        console.log('Map initialized:', map);
    }

    initMap();

    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('expanded');
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                console.log('Map size updated after sidebar toggle');
            }
        }, 300);
    });

    applyFiltersBtn.addEventListener('click', function() {
        fetchFilteredTrips();
    });

    function fetchFilteredTrips() {
        const status = statusFilter.value;
        const dateRange = dateRangeFilter.value;
        const driver = driverFilter.value;

        fetch(`/get_filtered_trips?status=${status}&date_range=${dateRange}&driver=${driver}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(trips => {
                updateFilteredTripsList(trips);
                updateAllTripsList(trips);
                updateMapMarkers(trips);
            })
            .catch(error => {
                console.error('Error fetching filtered trips:', error);
                alert('An error occurred while fetching trip data. Please try again.');
            });
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

    addTripBtn.addEventListener('click', () => toggleForm(addTripForm));
    addDriverBtn.addEventListener('click', () => toggleForm(addDriverForm));
    addPassengerBtn.addEventListener('click', () => toggleForm(addPassengerForm));

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.popup-form').classList.add('hidden');
        });
    });

    function toggleForm(form) {
        form.classList.toggle('hidden');
    }

    document.getElementById('trip-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/create_trip', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Trip created successfully!');
                addTripForm.classList.add('hidden');
                fetchFilteredTrips();
            } else {
                alert('Error creating trip: ' + data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('driver-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/add_driver', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Driver added successfully!');
                addDriverForm.classList.add('hidden');
                fetchDrivers();
            } else {
                alert('Error adding driver: ' + data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('passenger-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/add_passenger', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Passenger added successfully!');
                addPassengerForm.classList.add('hidden');
            } else {
                alert('Error adding passenger: ' + data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    function fetchDrivers() {
        fetch('/get_drivers')
            .then(response => response.json())
            .then(drivers => {
                updateDriverFilter(drivers);
            })
            .catch(error => console.error('Error fetching drivers:', error));
    }

    function updateDriverFilter(drivers) {
        driverFilter.innerHTML = '<option value="all">All Drivers</option>';
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            driverFilter.appendChild(option);
        });
    }

    fetchFilteredTrips();
    fetchDrivers();

    socket.on('connect', function() {
        socket.emit('join', {room: 'dispatchers'});
    });

    socket.on('trip_status_update', function(data) {
        fetchFilteredTrips();
    });

    socket.on('trip_completed', function(data) {
        fetchFilteredTrips();
    });

    window.addEventListener('resize', function() {
        if (map) {
            map.invalidateSize();
        }
    });
});
