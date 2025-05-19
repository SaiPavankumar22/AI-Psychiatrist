from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file, session, send_from_directory
from flask_cors import CORS
import os
from faster_whisper import WhisperModel
from werkzeug.utils import secure_filename
from langchain_groq import ChatGroq
import edge_tts
import asyncio
import logging
from collections import deque
import json
from dotenv import load_dotenv
import time
import uuid
import base64
from PIL import Image
import io
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
from functools import wraps
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from standup_server import socketio, init_app

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)  # Changed from DEBUG to INFO to reduce log spam
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)  # Required for session

app.config['SECRET_KEY'] = 'mindmate_secret_key'

# Connect to MongoDB
try:
    # Connect to local MongoDB instance (MongoDB Compass)
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    db = client['mindmate_db']  # Database name
    
    # Collections
    users = db['users']
    chat_sessions = db['chat_sessions']
    diary_entries = db['diary_entries']
    goals = db['goals']
    tasks = db['tasks']
    mood_entries = db['mood_entries']
    activities = db['activities']  # For general activity tracking
    
    # Test the connection
    client.server_info()
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"MongoDB connection error: {str(e)}")
    raise

# Helper function to convert MongoDB ObjectId to string in JSON responses
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

app.json_encoder = JSONEncoder

# Context processor to include navigation data in all templates
@app.context_processor
def inject_nav_data():
    def get_user_data():
        if 'user_id' in session:
            user = users.find_one({'_id': ObjectId(session['user_id'])})
            if user:
                return {
                    'name': user.get('name', 'User'),
                    'email': user.get('email', ''),
                    'is_authenticated': True
                }
        return {'is_authenticated': False}
    
    return {'get_user_data': get_user_data}

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Extract token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            current_user = users.find_one({'_id': ObjectId(current_user_id)})
            
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
                
        except Exception as e:
            return jsonify({'message': f'Token is invalid! {str(e)}'}), 401
        
        # Pass the user to the route
        return f(current_user, *args, **kwargs)
    
    return decorated

# Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Check if user already exists
        if users.find_one({'email': data['email']}):
            return jsonify({'message': 'User already exists!', 'success': False}), 409
        
        # Hash the password
        hashed_password = generate_password_hash(data['password'])
        
        # Create new user
        new_user = {
            'name': data['name'],
            'email': data['email'],
            'password': hashed_password,
            'created_at': datetime.utcnow()
        }
        
        # Insert user into database
        result = users.insert_one(new_user)
        
        # Create token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'exp': datetime.utcnow() + timedelta(days=30)
        }, app.config['SECRET_KEY'])
        
        # Log activity
        activities.insert_one({
            'user_id': result.inserted_id,
            'category': 'account',
            'action': 'register',
            'timestamp': datetime.utcnow(),
            'details': 'User account created'
        })
        
        # Set session
        session['user_id'] = str(result.inserted_id)
        
        return jsonify({
            'token': token,
            'user_id': str(result.inserted_id),
            'name': data['name'],
            'success': True
        }), 201
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'message': 'Registration failed', 'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Find user by email
        user = users.find_one({'email': data['email']})
        
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({'message': 'Invalid credentials!', 'success': False}), 401
        
        # Create token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.utcnow() + timedelta(days=30)
        }, app.config['SECRET_KEY'])
        
        # Log activity
        activities.insert_one({
            'user_id': user['_id'],
            'category': 'account',
            'action': 'login',
            'timestamp': datetime.utcnow(),
            'details': 'User logged in'
        })
        
        # Set session
        session['user_id'] = str(user['_id'])
        
        return jsonify({
            'token': token,
            'user_id': str(user['_id']),
            'name': user['name'],
            'success': True
        }), 200
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed', 'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True}), 200

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    try:
        token = request.headers.get('Authorization', '').split(' ')[1]
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = users.find_one({'_id': ObjectId(data['user_id'])})
        
        if user:
            return jsonify({'valid': True, 'user': {'name': user['name'], 'email': user['email']}})
        return jsonify({'valid': False}), 401
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 401

# === Configuration ===
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "responses"
MAX_HISTORY_LENGTH = 5  # Maximum number of conversation pairs to keep
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# === Initialize Whisper and Groq ===
logger.info("Initializing Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model initialized successfully")

logger.info("Initializing Groq LLM...")
llm = ChatGroq(
    temperature=0.6,
    groq_api_key=os.getenv('GROQ_API_KEY'),
    model_name="llama-3.3-70b-versatile"
)
logger.info("Groq LLM initialized successfully")

# === Conversation History Management ===
def get_conversation_history():
    if 'conversation_history' not in session:
        session['conversation_history'] = []
    return session['conversation_history']

def add_to_history(user_input, ai_response):
    history = get_conversation_history()
    history.append({
        'user': user_input,
        'ai': ai_response
    })
    # Keep only the last MAX_HISTORY_LENGTH conversations
    if len(history) > MAX_HISTORY_LENGTH:
        history = history[-MAX_HISTORY_LENGTH:]
    session['conversation_history'] = history

def format_conversation_history():
    history = get_conversation_history()
    formatted_history = ""
    for entry in history:
        formatted_history += f"User: {entry['user']}\nAI: {entry['ai']}\n\n"
    return formatted_history

# === Helper: AI Response ===
def get_ai_response(transcription):
    logger.debug(f"Getting AI response for transcription: {transcription[:100]}...")
    
    # Get conversation history
    conversation_history = format_conversation_history()
    
    prompt = (
        f"Previous conversation:\n{conversation_history}\n"
        f"Current user message: {transcription}\n\n"
        "You are a highly experienced, warm, and friendly AI Psychiatrist. "
        "Please answer the user with empathy and offer supportive guidance based on their concerns. "
        "Please provide the answer not too long and not too short like it should be like a conversation. "
        "Please provide the answer in a way that is easy to understand and not too technical, not too formal and not too informal."
    )
    
    try:
        response = llm.invoke(prompt)
        ai_response = response.content if hasattr(response, 'content') else str(response)
        logger.debug(f"Successfully received AI response: {ai_response[:100]}...")
        
        # Add to conversation history
        add_to_history(transcription, ai_response)
        
        return ai_response
    except Exception as e:
        logger.error(f"Error getting AI response: {str(e)}")
        # Return a fallback response
        fallback_response = "I'm sorry, I'm having some trouble connecting to my thinking capabilities right now. Could you please try again in a moment?"
        return fallback_response

def get_ai_text_response(user_input):
    logger.debug(f"Getting AI response for text input: {user_input[:100]}...")
    
    # Get conversation history
    conversation_history = format_conversation_history()
    
    prompt = (
        f"Previous conversation:\n{conversation_history}\n"
        f"Current user message: {user_input}\n\n"
        "You are a highly experienced, warm, and friendly AI Psychiatrist. "
        "Please answer the user with empathy and offer supportive guidance based on their concerns. "
        "Please provide the answer not too long and not too short like it should be like a conversation. "
        "Please provide the answer in a way that is easy to understand and not too technical, not too formal and not too informal."
    )
    
    try:
        # Use the same LLM as voice chat to avoid API key issues
        response = llm.invoke(prompt)
        ai_response = response.content if hasattr(response, 'content') else str(response)
        logger.debug(f"Successfully received AI response: {ai_response[:100]}...")
        
        # Add to conversation history
        add_to_history(user_input, ai_response)
        
        return ai_response
    except Exception as e:
        logger.error(f"Error getting AI response: {str(e)}")
        # Return a fallback response
        fallback_response = "I'm sorry, I'm having some trouble connecting to my thinking capabilities right now. Could you please try again in a moment?"
        # Still add to history so the UI flow is maintained
        add_to_history(user_input, fallback_response)
        return fallback_response

# === Helper: Text to Speech with Edge-TTS ===
async def edge_tts_async(text, output_path, voice="en-US-JennyNeural"):
    logger.debug(f"Converting text to speech: {text[:100]}...")
    try:
        communicate = edge_tts.Communicate(text, voice=voice)
        await communicate.save(output_path)
        logger.debug(f"Successfully saved audio to {output_path}")
    except Exception as e:
        logger.error(f"Error in text-to-speech conversion: {str(e)}")
        raise

def text_to_speech(text, output_path="responses/response.mp3"):
    logger.debug("Starting text-to-speech conversion")
    try:
        asyncio.run(edge_tts_async(text, output_path))
        return output_path
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        raise

@app.route('/voice_chat', methods=['POST'])
def voice_chat():
    logger.info("Received voice chat request")
    
    if 'audio' not in request.files:
        logger.error("No audio file in request")
        return jsonify({'error': 'No audio file uploaded'}), 400

    file = request.files['audio']
    if file.filename == '':
        logger.error("Empty filename received")
        return jsonify({'error': 'Empty filename'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        logger.debug(f"Saving uploaded file to {filepath}")
        file.save(filepath)
        logger.debug("File saved successfully")

        # Transcribe the audio
        logger.debug("Starting audio transcription")
        segments, _ = model.transcribe(filepath)
        transcription = " ".join([segment.text for segment in segments])
        logger.debug(f"Transcription completed: {transcription[:100]}...")

        # Get AI response
        logger.debug("Getting AI response")
        ai_response = get_ai_response(transcription)
        logger.debug(f"AI response received: {ai_response[:100]}...")
        
        # Add to conversation history (already handled in get_ai_response)

        # Convert AI response to speech
        output_filename = f"response_{os.path.splitext(filename)[0]}.mp3"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        logger.debug(f"Converting response to speech, output path: {output_path}")
        text_to_speech(ai_response, output_path)
        logger.debug("Speech conversion completed")

        # Return the MP3 audio file directly
        logger.info("Sending response file to client")
        return send_file(output_path, mimetype='audio/mpeg')

    except Exception as e:
        logger.error(f"Error processing voice chat request: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    finally:
        if os.path.exists(filepath):
            logger.debug(f"Cleaning up temporary file: {filepath}")
            os.remove(filepath)

@app.route('/')
def index():
    logger.info("Serving index page")
    return render_template('landing.html')

@app.route('/games')
def games():
    logger.info("Serving games page")
    return render_template('games.html')


@app.route('/clear_history', methods=['POST'])
def clear_history():
    logger.info("Clearing conversation history")
    if 'conversation_history' in session:
        session['conversation_history'] = []
    return jsonify({'status': 'success'}), 200

@app.route('/get_history', methods=['GET'])
def get_history():
    logger.info("Getting conversation history")
    history = get_conversation_history()
    return jsonify({'history': history}), 200

@app.route('/text_chat', methods=['POST'])
def text_chat():
    logger.info("Received text chat request")
    try:
        data = request.json
        user_input = data.get('user_input')
        if not user_input:
            logger.error("No user input provided")
            return jsonify({'error': 'No user input provided'}), 400
            
        logger.debug(f"User input: {user_input}")
        
        # Get AI response
        logger.debug("Getting AI text response")
        ai_response = get_ai_text_response(user_input)
        logger.debug(f"AI response received: {ai_response[:100]}...")
        
        # Return the response as JSON
        return jsonify({
            'response': ai_response
        })
        
    except Exception as e:
        logger.error(f"Error processing text chat request: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/text_to_speech', methods=['POST'])
def text_to_speech_route():
    logger.info("Received text-to-speech request")
    try:
        data = request.json
        text = data.get('text')
        if not text:
            logger.error("No text provided")
            return jsonify({'error': 'No text provided'}), 400
            
        logger.debug(f"Converting text to speech: {text[:100]}...")
        
        # Generate a unique filename
        output_filename = f"response_{int(time.time())}.mp3"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        # Convert text to speech
        text_to_speech(text, output_path)
        
        # Return the speech file
        return send_file(output_path, mimetype='audio/mpeg')
        
    except Exception as e:
        logger.error(f"Error processing text-to-speech request: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Create uploads directory if it doesn't exist
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.route('/api/diary/create-entry', methods=['POST'])
@token_required
def create_diary_entry(current_user):
    data = request.get_json()
    
    new_entry = {
        'user_id': current_user['_id'],
        'title': data['title'],
        'content': data['content'],
        'mood': data.get('mood'),  # Optional mood rating
        'tags': data.get('tags', []),  # Optional tags
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
        'images': [],  # Initialize empty images array
        'year': datetime.utcnow().year  # Add year for filtering by year
    }
    
    result = diary_entries.insert_one(new_entry)
    
    # Log activity
    activities.insert_one({
        'user_id': current_user['_id'],
        'category': 'diary',
        'action': 'create_entry',
        'timestamp': datetime.utcnow(),
        'details': f"Created diary entry: {data['title']}",
        'reference_id': result.inserted_id
    })
    
    return jsonify({'entry_id': str(result.inserted_id)}), 201

@app.route('/api/diary/create-entry-with-images', methods=['POST'])
@token_required
def create_diary_entry_with_images(current_user):
    data = request.get_json()
    
    # Process images if any
    images = []
    if 'images' in data and data['images']:
        for img in data['images']:
            # Extract base64 data from the data URL
            if 'data' in img and img['data'].startswith('data:image/'):
                # Format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASA...
                # Extract only the base64 part
                img_format = img['data'].split(';')[0].split('/')[-1]
                img_data = img['data'].split(',', 1)[1]
                
                # Generate a unique filename
                filename = f"{secure_filename(str(uuid.uuid4()))}.{img_format}"
                filepath = os.path.join(UPLOADS_DIR, filename)
                
                try:
                    # Decode and save image
                    img_bytes = base64.b64decode(img_data)
                    img_io = io.BytesIO(img_bytes)
                    img_pil = Image.open(img_io)
                    img_pil.save(filepath)
                    
                    # Add to images array
                    images.append({
                        'filename': filename,
                        'original_name': img.get('filename', 'unknown')
                    })
                except Exception as e:
                    print(f"Error saving image: {str(e)}")
    
    # Create the diary entry
    entry_date = datetime.utcnow()
    new_entry = {
        'user_id': current_user['_id'],
        'title': data['title'],
        'content': data['content'],
        'mood': data.get('mood'),  # Optional mood rating
        'tags': data.get('tags', []),  # Optional tags
        'created_at': entry_date,
        'updated_at': entry_date,
        'images': images,  # Store image references
        'year': entry_date.year  # Add year for filtering by year
    }
    
    result = diary_entries.insert_one(new_entry)
    
    # Log activity
    activities.insert_one({
        'user_id': current_user['_id'],
        'category': 'diary',
        'action': 'create_entry',
        'timestamp': entry_date,
        'details': f"Created diary entry with images: {data['title']}",
        'reference_id': result.inserted_id
    })
    
    return jsonify({'entry_id': str(result.inserted_id), 'images': images}), 201

@app.route('/api/diary/get-entries', methods=['GET'])
@token_required
def get_diary_entries(current_user):
    entries = list(diary_entries.find(
        {'user_id': current_user['_id']}
    ).sort('created_at', -1))
    
    return jsonify({'entries': entries}), 200

@app.route('/api/diary/get-entries-by-year', methods=['GET'])
@token_required
def get_entries_by_year(current_user):
    year = request.args.get('year')
    if not year:
        return jsonify({'error': 'Year parameter is required'}), 400
    
    # Convert year to integer
    try:
        year_int = int(year)
    except ValueError:
        return jsonify({'error': 'Year must be a valid number'}), 400
    
    # Find entries for the specified year
    entries = list(diary_entries.find(
        {
            'user_id': current_user['_id'],
            'year': year_int
        }
    ).sort('created_at', -1))
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        entry['_id'] = str(entry['_id'])
        entry['user_id'] = str(entry['user_id'])
        if 'created_at' in entry:
            entry['created_at'] = entry['created_at'].isoformat()
        if 'updated_at' in entry:
            entry['updated_at'] = entry['updated_at'].isoformat()
    
    return jsonify({'entries': entries, 'year': year}), 200

@app.route('/api/diary/get-entry-by-date', methods=['GET'])
@token_required
def get_entry_by_date(current_user):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date parameter is required'}), 400
    
    # Parse the date
    try:
        date_obj = datetime.fromisoformat(date_str)
        start_of_day = datetime.combine(date_obj.date(), datetime.min.time())
        end_of_day = datetime.combine(date_obj.date(), datetime.max.time())
    except ValueError:
        return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400
    
    # Find entry for the specified date
    entry = diary_entries.find_one(
        {
            'user_id': current_user['_id'],
            'created_at': {'$gte': start_of_day, '$lte': end_of_day}
        }
    )
    
    if not entry:
        return jsonify({'error': 'No entry found for the specified date'}), 404
    
    # Convert ObjectId to string for JSON serialization
    entry['_id'] = str(entry['_id'])
    entry['user_id'] = str(entry['user_id'])
    if 'created_at' in entry:
        entry['created_at'] = entry['created_at'].isoformat()
    if 'updated_at' in entry:
        entry['updated_at'] = entry['updated_at'].isoformat()
    
    return jsonify({'entry': entry}), 200

# Route to serve uploaded images
@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html')

@app.route('/chat')
def chat():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('chat.html')

@app.route('/diary')
def diary():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return redirect(url_for('diary1'))

@app.route('/diary1')
def diary1():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('diary1.html')

@app.route('/history')
def history():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('history.html')

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('profile.html')

@app.route('/standup')
def standup():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('stand-up.html')


@app.route('/voice')
def voice():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('index.html')

if __name__ == '__main__':
    logger.info("Starting Flask application")
    init_app(app)
    socketio.run(app, debug=True)