document.addEventListener('DOMContentLoaded', function() {
    const statusFilter = document.getElementById('status-filter');
    const dateRangeFilter = document.getElementById('date-range-filter');
    const driverFilter = document.getElementById('driver-filter');
    const passengerFilter = document.getElementById('passenger-filter');
    const filteredTripsList = document.getElementById('filtered-trips-list');
    const tripList = document.getElementById('trip-list');

    // Add event listeners for filter changes
    statusFilter.addEventListener('change', fetchFilteredTrips);
    dateRangeFilter.addEventListener('change', fetchFilteredTrips);
    driverFilter.addEventListener('change', fetchFilteredTrips);
    passengerFilter.addEventListener('change', fetchFilteredTrips);

    // Call fetchFilteredTrips when the page loads
    fetchFilteredTrips();

    function fetchFilteredTrips() {
        const status = statusFilter.value;
        const dateRange = dateRangeFilter.value;
        const driver = driverFilter.value;
        const passenger = passengerFilter.value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

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
                updateFilteredTripsList(trips);
                updateAllTripsList(trips);
                updateMapMarkers(trips);
            })
            .catch(error => {
                console.error('Error fetching filtered trips:', error);
                showErrorMessage('Failed to fetch trips. Please try again. Error: ' + error.message);
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
                <p><strong>Pickup Time:</strong> ${trip.pickup_time ? new Date(trip.pickup_time).toLocaleString() : 'N/A'}</p>
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
        // Implement map marker update logic here
    }

    function showErrorMessage(message) {
        // Implement error message display
        console.error(message);
        alert(message);
    }

    // Add any additional functions needed for edit, delete, etc.
});
