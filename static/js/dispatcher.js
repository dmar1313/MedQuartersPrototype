document.addEventListener('DOMContentLoaded', function() {
    const createTripForm = document.getElementById('create-trip-form');
    const tripList = document.getElementById('trip-list');

    createTripForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(createTripForm);
        fetch('/create_trip', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Trip created successfully!');
                location.reload(); // Reload the page to show the new trip
            } else {
                alert('Error creating trip: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while creating the trip.');
        });
    });
});
