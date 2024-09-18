from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Trip
from forms import LoginForm, SignUpForm, TripForm
import os
from datetime import datetime, timedelta
import pytz
import random

app = Flask(__name__)
app.config.from_object('config.Config')
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Existing routes and functions

@app.route('/get_filtered_trips')
@login_required
def get_filtered_trips():
    if current_user.role != 'dispatcher':
        return jsonify({'error': 'Unauthorized'}), 403
    
    status = request.args.get('status', 'All')
    date_range = request.args.get('date_range', 'all')
    driver_id = request.args.get('driver', 'all')
    passenger_id = request.args.get('passenger', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Trip.query

    if status != 'All':
        query = query.filter_by(status=status)

    if date_range != 'all':
        today = datetime.now(pytz.UTC).date()
        if date_range == 'today':
            query = query.filter(Trip.pickup_time >= today)
        elif date_range == 'week':
            start_of_week = today - timedelta(days=today.weekday())
            query = query.filter(Trip.pickup_time >= start_of_week)
        elif date_range == 'month':
            start_of_month = today.replace(day=1)
            query = query.filter(Trip.pickup_time >= start_of_month)
        elif date_range == 'custom':
            if start_date and end_date:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Trip.pickup_time >= start, Trip.pickup_time <= end)

    if driver_id != 'all':
        query = query.filter_by(driver_id=driver_id)

    if passenger_id != 'all':
        query = query.filter_by(patient_name=passenger_id)  # Assuming patient_name is used for passengers

    trips = query.all()
    
    trip_list = []
    for trip in trips:
        trip_data = {
            'id': trip.id,
            'patient_name': trip.patient_name,
            'pickup_location': trip.pickup_location,
            'dropoff_location': trip.dropoff_location,
            'status': trip.status,
            'driver': trip.driver.username if trip.driver else 'Unassigned',
            'pickup_lat': random.uniform(25, 49),  # Replace with actual data in production
            'pickup_lon': random.uniform(-125, -65),  # Replace with actual data in production
            'dropoff_lat': random.uniform(25, 49),  # Replace with actual data in production
            'dropoff_lon': random.uniform(-125, -65),  # Replace with actual data in production
            'pickup_time': trip.pickup_time.isoformat() if trip.pickup_time else None
        }
        trip_list.append(trip_data)
    
    app.logger.debug(f"Sending trip data to frontend: {trip_list}")
    
    return jsonify(trip_list)

# Add other existing routes and functions here

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
