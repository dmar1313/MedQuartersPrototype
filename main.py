from flask import Flask, render_template, redirect, url_for, request, jsonify, flash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, User, Trip, Signature
from forms import LoginForm, SignUpForm, TripForm
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
@login_required
def index():
    if current_user.role == 'dispatcher':
        return redirect(url_for('dispatcher_dashboard'))
    elif current_user.role == 'driver':
        return redirect(url_for('driver_dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and check_password_hash(user.password_hash, form.password.data):
            login_user(user)
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('index')
            return redirect(next_page)
        flash('Invalid username or password')
    return render_template('login.html', form=form)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = SignUpForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, role=form.role.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        return redirect(url_for('login'))
    return render_template('signup.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dispatcher_dashboard')
@login_required
def dispatcher_dashboard():
    if current_user.role != 'dispatcher':
        return redirect(url_for('index'))
    form = TripForm()
    drivers = User.query.filter_by(role='driver').all()
    form.driver_id.choices = [(d.id, d.username) for d in drivers]
    trips = Trip.query.all()
    return render_template('dispatcher_dashboard.html', form=form, drivers=drivers, trips=trips)

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
        trip = Trip(
            patient_name=form.patient_name.data,
            pickup_location=form.pickup_location.data,
            dropoff_location=form.dropoff_location.data,
            pickup_time=form.pickup_time.data,
            driver_id=form.driver_id.data
        )
        db.session.add(trip)
        db.session.commit()
        return jsonify({'success': True, 'trip_id': trip.id})
    return jsonify({'error': 'Invalid form data'}), 400

@app.route('/update_trip_status', methods=['POST'])
@login_required
def update_trip_status():
    if current_user.role != 'driver':
        return jsonify({'error': 'Unauthorized'}), 403
    trip_id = request.json.get('trip_id')
    new_status = request.json.get('status')
    trip = Trip.query.get(trip_id)
    if trip and trip.driver_id == current_user.id:
        trip.status = new_status
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid trip or unauthorized'}), 400

@app.route('/submit_signature', methods=['POST'])
@login_required
def submit_signature():
    if current_user.role != 'driver':
        return jsonify({'error': 'Unauthorized'}), 403
    trip_id = request.json.get('trip_id')
    signature_data = request.json.get('signature')
    trip = Trip.query.get(trip_id)
    if trip and trip.driver_id == current_user.id:
        signature = Signature(trip_id=trip_id, signature_data=signature_data)
        db.session.add(signature)
        trip.status = 'Completed'
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid trip or unauthorized'}), 400

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
