from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, DateTimeField, SelectField
from wtforms.validators import DataRequired, EqualTo, ValidationError
from models import User

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Log In')

class SignUpForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    role = SelectField('Role', choices=[('dispatcher', 'Dispatcher'), ('driver', 'Driver')], validators=[DataRequired()])
    submit = SubmitField('Sign Up')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already exists. Please choose a different one.')

class TripForm(FlaskForm):
    patient_name = StringField('Patient Name', validators=[DataRequired()])
    pickup_location = StringField('Pickup Location', validators=[DataRequired()])
    dropoff_location = StringField('Dropoff Location', validators=[DataRequired()])
    pickup_time = DateTimeField('Pickup Time', validators=[DataRequired()], format='%Y-%m-%d %H:%M')
    driver_id = SelectField('Assign Driver', coerce=int, validators=[DataRequired()])
    submit = SubmitField('Create Trip')
