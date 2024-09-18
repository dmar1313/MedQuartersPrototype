document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded');
    const statusFilter = document.getElementById('status-filter');
    const dateRangeFilter = document.getElementById('date-range-filter');
    const driverFilter = document.getElementById('driver-filter');
    const passengerFilter = document.getElementById('passenger-filter');
    const currentTripsList = document.getElementById('current-trips-list');
    const tripList = document.getElementById('trip-list');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const map = L.map('map').setView([40.7128, -74.0060], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log('Map initialized');

    // Add event listeners for filter changes
    statusFilter.addEventListener('change', handleFilterChange);
    dateRangeFilter.addEventListener('change', handleDateRangeChange);
    driverFilter.addEventListener('change', handleFilterChange);
    passengerFilter.addEventListener('change', handleFilterChange);
    applyFiltersBtn.addEventListener('click', fetchFilteredTrips);

    console.log('Event listeners added');

    // Initialize tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Call fetchFilteredTrips when the page loads
    fetchFilteredTrips();

    function handleFilterChange() {
        console.log('Filter changed');
        fetchFilteredTrips();
    }

    function handleDateRangeChange() {
        const customDateRange = document.getElementById('custom-date-range');
        if (dateRangeFilter.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
        }
        fetchFilteredTrips();
    }

    function fetchFilteredTrips() {
        console.log('Fetching filtered trips');
        const status = statusFilter.value;
        const dateRange = dateRangeFilter.value;
        const driver = driverFilter.value;
        const passenger = passengerFilter.value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        console.log('Filter values:', { status, dateRange, driver, passenger, startDate, endDate });

        fetch(`/get_filtered_trips?status=${status}&date_range=${dateRange}&driver=${driver}&passenger=${passenger}&start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(trips => {
                console.log('Received trips:', trips);
                if (!Array.isArray(trips)) {
                    throw new Error('Received data is not an array');
                }
                updateCurrentTripsList(trips);
                updateAllTripsList(trips);
                updateMapMarkers(trips);
            })
            .catch(error => {
                console.error('Error fetching filtered trips:', error);
                showErrorMessage('Failed to fetch trips. Please try again. Error: ' + error.message);
            });
    }

    function updateCurrentTripsList(trips) {
        console.log('Updating current trips list');
        currentTripsList.innerHTML = '';
        trips.forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.classList.add('current-trip-item');
            tripElement.innerHTML = `
                <p><strong>ID:</strong> ${trip.id}</p>
                <p><strong>Patient:</strong> ${trip.patient_name}</p>
                <p><strong>Status:</strong> ${trip.status}</p>
                <p><strong>Driver:</strong> ${trip.driver}</p>
                <p><strong>Pickup Time:</strong> ${trip.pickup_time ? new Date(trip.pickup_time).toLocaleString() : 'N/A'}</p>
            `;
            currentTripsList.appendChild(tripElement);
        });
    }

    function updateAllTripsList(trips) {
        console.log('Updating all trips list');
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
                <td>${trip.pickup_time ? new Date(trip.pickup_time).toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="edit-trip-btn" data-trip-id="${trip.id}">Edit</button>
                    <button class="delete-trip-btn" data-trip-id="${trip.id}">Delete</button>
                </td>
            `;
            tripList.appendChild(row);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-trip-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tripId = this.dataset.tripId;
                editTrip(tripId);
            });
        });

        document.querySelectorAll('.delete-trip-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tripId = this.dataset.tripId;
                deleteTrip(tripId);
            });
        });
    }

    function updateMapMarkers(trips) {
        console.log('Updating map markers');
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        trips.forEach(trip => {
            if (trip.pickup_lat && trip.pickup_lon) {
                L.marker([trip.pickup_lat, trip.pickup_lon])
                    .addTo(map)
                    .bindPopup(`<b>${trip.patient_name}</b><br>Pickup: ${trip.pickup_location}`);
            }
            if (trip.dropoff_lat && trip.dropoff_lon) {
                L.marker([trip.dropoff_lat, trip.dropoff_lon])
                    .addTo(map)
                    .bindPopup(`<b>${trip.patient_name}</b><br>Dropoff: ${trip.dropoff_location}`);
            }
        });
    }

    function showErrorMessage(message) {
        console.error(message);
        alert(message);
    }

    // Add functions for editing and deleting trips
    function editTrip(tripId) {
        console.log('Editing trip:', tripId);
        // Implement edit trip functionality
    }

    function deleteTrip(tripId) {
        console.log('Deleting trip:', tripId);
        // Implement delete trip functionality
    }

    // Initialize sidebar functionality
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const addTripBtn = document.getElementById('add-trip-btn');
    const addDriverBtn = document.getElementById('add-driver-btn');
    const addPassengerBtn = document.getElementById('add-passenger-btn');

    toggleSidebarBtn.addEventListener('click', function() {
        sidebar.classList.toggle('expanded');
    });

    addTripBtn.addEventListener('click', function() {
        console.log('Add trip button clicked');
        // Implement add trip functionality
    });

    addDriverBtn.addEventListener('click', function() {
        console.log('Add driver button clicked');
        // Implement add driver functionality
    });

    addPassengerBtn.addEventListener('click', function() {
        console.log('Add passenger button clicked');
        // Implement add passenger functionality
    });
});
