from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from models.database import init_db
from routes.auth import auth_bp
from routes.expense import expense_bp
from routes.analysis import analysis_bp
from routes.smart import smart_bp
from routes.ocr import ocr_bp
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey' # For session management
CORS(app)

# Initialize Database
if not os.path.exists('expenses.db'):
    init_db()

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(expense_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(smart_bp)
app.register_blueprint(ocr_bp)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

# Serve static files (if needed, Flask does this automatically for /static)
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
