document.addEventListener('DOMContentLoaded', function() {
    const tripList = document.getElementById('trip-list');
    const signatureModal = document.getElementById('signature-modal');
    const signaturePad = new SignaturePad(document.getElementById('signature-pad'));
    let currentTripId = null;
    const socket = io();

    tripList.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-trip')) {
            const tripId = e.target.closest('li').dataset.tripId;
            updateTripStatus(tripId, 'In Progress');
        } else if (e.target.classList.contains('complete-trip')) {
            currentTripId = e.target.closest('li').dataset.tripId;
            signatureModal.classList.remove('hidden');
        } else if (e.target.classList.contains('navigate')) {
            const address = e.target.dataset.address;
            openNavigation(address);
        }
    });

    document.getElementById('clear-signature').addEventListener('click', function() {
        signaturePad.clear();
    });

    document.getElementById('submit-signature').addEventListener('click', function() {
        if (signaturePad.isEmpty()) {
            showErrorMessage('Please provide a signature');
            return;
        }

        const signatureData = signaturePad.toDataURL();
        submitSignature(currentTripId, signatureData);
    });

    function updateTripStatus(tripId, status) {
        fetch('/update_trip_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trip_id: tripId, status: status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tripElement = document.querySelector(`li[data-trip-id="${tripId}"]`);
                tripElement.querySelector('.trip-status').textContent = status;
                if (status === 'In Progress') {
                    tripElement.querySelector('.start-trip').classList.add('hidden');
                    tripElement.querySelector('.complete-trip').classList.remove('hidden');
                }
                showSuccessMessage(`Trip status updated to ${status}`);
            } else {
                showErrorMessage('Error updating trip status: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('An error occurred while updating the trip status.');
        });
    }

    function submitSignature(tripId, signatureData) {
        fetch('/submit_signature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trip_id: tripId, signature: signatureData })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage('Trip completed successfully!');
                signatureModal.classList.add('hidden');
                location.reload(); // Reload the page to update the trip list
            } else {
                showErrorMessage('Error submitting signature: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('An error occurred while submitting the signature.');
        });
    }

    function openNavigation(address) {
        const encodedAddress = encodeURIComponent(address);
        
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.location.href = `maps://maps.apple.com/?q=${encodedAddress}`;
        } else {
            window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        }
    }

    function showSuccessMessage(message) {
        // Implement success message display
        alert(message);
    }

    function showErrorMessage(message) {
        // Implement error message display
        alert(message);
    }

    socket.on('connect', function() {
        const driverId = document.body.dataset.driverId;
        socket.emit('join', {room: `driver_${driverId}`});
    });

    socket.on('new_trip', function(data) {
        showSuccessMessage(`New trip assigned: Patient ${data.patient_name}`);
        location.reload(); // Reload the page to show the new trip
    });

    // Add this function to refresh the trip list periodically
    function refreshTripList() {
        fetch('/get_driver_trips')
            .then(response => response.json())
            .then(trips => {
                updateTripList(trips);
            })
            .catch(error => {
                console.error('Error fetching trips:', error);
                showErrorMessage('Failed to refresh trip list. Please try again.');
            });
    }

    function updateTripList(trips) {
        tripList.innerHTML = '';
        trips.forEach(trip => {
            const tripElement = document.createElement('li');
            tripElement.classList.add('trip-item');
            tripElement.dataset.tripId = trip.id;
            tripElement.innerHTML = `
                <div class="trip-details">
                    <p><strong>Patient:</strong> ${trip.patient_name}</p>
                    <p><strong>Pickup:</strong> ${trip.pickup_location}</p>
                    <p><strong>Dropoff:</strong> ${trip.dropoff_location}</p>
                    <p><strong>Time:</strong> ${new Date(trip.pickup_time).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="trip-status">${trip.status}</span></p>
                </div>
                <div class="trip-actions">
                    ${trip.status === 'Assigned' ? '<button class="start-trip btn">Start Trip</button>' : ''}
                    ${trip.status === 'In Progress' ? '<button class="complete-trip btn">Complete Trip</button>' : ''}
                    <button class="navigate btn" data-address="${trip.pickup_location}">Navigate to Pickup</button>
                </div>
            `;
            tripList.appendChild(tripElement);
        });
    }

    // Refresh trip list every 30 seconds
    setInterval(refreshTripList, 30000);

    // Initial refresh
    refreshTripList();
});
