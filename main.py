from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash
from models import db, User, Trip
from forms import LoginForm, SignUpForm, TripForm
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime, timedelta
import pytz
import random  # For generating random coordinates (remove in production)

app = Flask(__name__)
app.config.from_object('config.Config')
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'  # type: ignore
socketio = SocketIO(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'dispatcher':
            return redirect(url_for('dispatcher_dashboard'))
        elif current_user.role == 'driver':
            return redirect(url_for('driver_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        app.logger.info(f"Login attempt for username: {username}")
        
        user = User.query.filter_by(username=username).first()
        if user:
            app.logger.info(f"User {username} found in database")
            if check_password_hash(user.password_hash, password):
                app.logger.info(f"Password verification successful for user {username}")
                login_user(user)
                next_page = request.args.get('next')
                if not next_page or not next_page.startswith('/'):
                    next_page = url_for('index')
                return redirect(next_page)
            else:
                app.logger.warning(f"Password verification failed for user {username}")
                flash('Invalid username or password')
        else:
            app.logger.warning(f"User {username} not found in database")
            flash('Invalid username or password')
        
        return redirect(url_for('login', username=username))
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = SignUpForm()
    if form.validate_on_submit():
        user = User()
        user.username = form.username.data
        user.role = form.role.data
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('signup.html', form=form)

@app.route('/dispatcher_dashboard')
@login_required
def dispatcher_dashboard():
    if current_user.role != 'dispatcher':
        return redirect(url_for('index'))
    form = TripForm()
    trips = Trip.query.all()
    
    statuses = ['All', 'Unassigned', 'Assigned', 'In Progress', 'Complete', 'Canceled']
    
    return render_template('dispatcher_dashboard.html', 
                           form=form, 
                           trips=trips,
                           statuses=statuses)

@app.route('/reporting_dashboard')
@login_required
def reporting_dashboard():
    if current_user.role != 'dispatcher':
        return redirect(url_for('index'))
    return render_template('reporting_dashboard.html')

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
    
    trip_list = [
        {
            'id': trip.id,
            'patient_name': trip.patient_name,
            'pickup_location': trip.pickup_location,
            'dropoff_location': trip.dropoff_location,
            'status': trip.status,
            'driver': trip.driver.username if trip.driver else 'Unassigned',
            'pickup_lat': random.uniform(25, 49),  # Replace with actual data in production
            'pickup_lon': random.uniform(-125, -65),  # Replace with actual data in production
            'dropoff_lat': random.uniform(25, 49),  # Replace with actual data in production
            'dropoff_lon': random.uniform(-125, -65)  # Replace with actual data in production
        }
        for trip in trips
    ]
    
    app.logger.debug(f"Sending trip data to frontend: {trip_list}")
    
    return jsonify(trip_list)

@app.route('/driver_dashboard')
@login_required
def driver_dashboard():
    if current_user.role != 'driver':
        return redirect(url_for('index'))
    trips = Trip.query.filter_by(driver_id=current_user.id).all()
    return render_template('driver_dashboard.html', trips=trips)

@app.route('/create_trip', methods=['POST'])
@login_required
def create_trip():
    if current_user.role != 'dispatcher':
        return jsonify({'error': 'Unauthorized'}), 403
    form = TripForm()
    if form.validate_on_submit():
        try:
            pickup_time = form.pickup_time.data
            if pickup_time:
                if isinstance(pickup_time, str):
                    pickup_time = datetime.strptime(pickup_time, '%Y-%m-%dT%H:%M')
                pickup_time_utc = pickup_time.replace(tzinfo=pytz.UTC)
                
                trip = Trip()
                trip.patient_name = form.patient_name.data
                trip.pickup_location = form.pickup_location.data
                trip.dropoff_location = form.dropoff_location.data
                trip.pickup_time = pickup_time_utc
                trip.status = 'Unassigned'
                
                db.session.add(trip)
                db.session.commit()
                socketio.emit('new_trip', {'trip_id': trip.id, 'patient_name': trip.patient_name}, to='dispatchers')
                return jsonify({'success': True, 'trip_id': trip.id})
            else:
                return jsonify({'error': 'Invalid pickup time'}), 400
        except Exception as e:
            db.session.rollback()
            error_msg = f'Error creating trip: {str(e)}'
            app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 500
    else:
        return jsonify({'error': 'Invalid form data', 'form_errors': form.errors}), 400

@app.route('/assign_driver', methods=['POST'])
@login_required
def assign_driver():
    if current_user.role != 'dispatcher':
        return jsonify({'error': 'Unauthorized'}), 403
    
    trip_id = request.json.get('trip_id')
    driver_id = request.json.get('driver_id')
    
    if not trip_id or not driver_id:
        return jsonify({'error': 'Missing trip_id or driver_id'}), 400
    
    trip = Trip.query.get(trip_id)
    driver = User.query.filter_by(id=driver_id, role='driver').first()
    
    if not trip or not driver:
        return jsonify({'error': 'Invalid trip or driver'}), 404
    
    trip.driver_id = driver.id
    trip.status = 'Assigned'
    db.session.commit()
    
    socketio.emit('trip_assigned', {'trip_id': trip.id, 'driver_id': driver.id}, to=f'driver_{driver.id}')
    return jsonify({'success': True})

@app.route('/start_trip', methods=['POST'])
@login_required
def start_trip():
    if current_user.role != 'driver':
        return jsonify({'error': 'Unauthorized'}), 403
    
    trip_id = request.json.get('trip_id')
    
    if not trip_id:
        return jsonify({'error': 'Missing trip_id'}), 400
    
    trip = Trip.query.filter_by(id=trip_id, driver_id=current_user.id).first()
    
    if not trip:
        return jsonify({'error': 'Invalid trip'}), 404
    
    trip.status = 'In Progress'
    trip.start_time = datetime.now(pytz.UTC)
    db.session.commit()
    
    socketio.emit('trip_started', {'trip_id': trip.id}, to='dispatchers')
    return jsonify({'success': True})

@app.route('/complete_trip', methods=['POST'])
@login_required
def complete_trip():
    if current_user.role != 'driver':
        return jsonify({'error': 'Unauthorized'}), 403
    
    trip_id = request.json.get('trip_id')
    signature = request.json.get('signature')
    
    if not trip_id or not signature:
        return jsonify({'error': 'Missing trip_id or signature'}), 400
    
    trip = Trip.query.filter_by(id=trip_id, driver_id=current_user.id).first()
    
    if not trip:
        return jsonify({'error': 'Invalid trip'}), 404
    
    trip.status = 'Complete'
    trip.end_time = datetime.now(pytz.UTC)
    trip.signature = signature
    db.session.commit()
    
    socketio.emit('trip_completed', {'trip_id': trip.id}, to='dispatchers')
    return jsonify({'success': True})

@app.route('/delete_trip/<int:trip_id>', methods=['DELETE'])
@login_required
def delete_trip(trip_id):
    if current_user.role != 'dispatcher':
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        trip = Trip.query.get(trip_id)
        if trip:
            db.session.delete(trip)
            db.session.commit()
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Trip not found'}), 404
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting trip: {str(e)}")
        return jsonify({'error': f'Error deleting trip: {str(e)}'}), 500

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        if current_user.role == 'dispatcher':
            join_room('dispatchers')
        elif current_user.role == 'driver':
            join_room(f'driver_{current_user.id}')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Only create tables if they don't exist
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True, log_output=True)