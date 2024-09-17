document.addEventListener('DOMContentLoaded', function() {
    const statusFilter = document.getElementById('status-filter');
    const filteredTripsTable = document.getElementById('filtered-trips-table');
    const socket = io();

    statusFilter.addEventListener('change', function() {
        fetchFilteredTrips(this.value);
    });

    function fetchFilteredTrips(status) {
        fetch(`/get_filtered_trips?status=${status}`)
            .then(response => response.json())
            .then(trips => {
                updateFilteredTripsTable(trips);
            })
            .catch(error => console.error('Error fetching filtered trips:', error));
    }

    function updateFilteredTripsTable(trips) {
        const tbody = filteredTripsTable.querySelector('tbody');
        tbody.innerHTML = '';
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
            tbody.appendChild(row);
        });
    }

    // Initial load of all trips
    fetchFilteredTrips('All');

    socket.on('connect', function() {
        socket.emit('join', {room: 'dispatchers'});
    });

    socket.on('trip_status_update', function(data) {
        fetchFilteredTrips(statusFilter.value);
    });

    socket.on('trip_completed', function(data) {
        fetchFilteredTrips(statusFilter.value);
    });
});
