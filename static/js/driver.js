document.addEventListener('DOMContentLoaded', function() {
    const tripList = document.getElementById('trip-list');
    const signatureModal = document.getElementById('signature-modal');
    const signaturePad = new SignaturePad(document.getElementById('signature-pad'));
    let currentTripId = null;

    tripList.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-trip')) {
            const tripId = e.target.closest('li').dataset.tripId;
            updateTripStatus(tripId, 'In Progress');
        } else if (e.target.classList.contains('complete-trip')) {
            currentTripId = e.target.closest('li').dataset.tripId;
            signatureModal.classList.remove('hidden');
        }
    });

    document.getElementById('clear-signature').addEventListener('click', function() {
        signaturePad.clear();
    });

    document.getElementById('submit-signature').addEventListener('click', function() {
        if (signaturePad.isEmpty()) {
            alert('Please provide a signature');
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
            } else {
                alert('Error updating trip status: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the trip status.');
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
                alert('Trip completed successfully!');
                signatureModal.classList.add('hidden');
                location.reload(); // Reload the page to update the trip list
            } else {
                alert('Error submitting signature: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while submitting the signature.');
        });
    }

    // Add event listener for opening navigation app
    tripList.addEventListener('click', function(e) {
        if (e.target.classList.contains('navigate')) {
            const address = e.target.dataset.address;
            openNavigation(address);
        }
    });

    function openNavigation(address) {
        // Encode the address for use in the URL
        const encodedAddress = encodeURIComponent(address);
        
        // Check if the device is iOS or Android and open the appropriate map app
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.location.href = `maps://maps.apple.com/?q=${encodedAddress}`;
        } else {
            window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        }
    }
});
