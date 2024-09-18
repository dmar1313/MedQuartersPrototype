function fetchFilteredTrips() {
    const status = statusFilter.value;
    const dateRange = dateRangeFilter.value;
    const driver = driverFilter.value;
    const passenger = passengerFilter.value;

    fetch(`/get_filtered_trips?status=${status}&date_range=${dateRange}&driver=${driver}&passenger=${passenger}`)
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
