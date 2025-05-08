from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file, session
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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)  # Required for session

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
        raise

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
    return render_template('index.html')

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(debug=True)


