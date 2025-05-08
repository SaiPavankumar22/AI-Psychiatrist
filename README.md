# AI Psychiatrist Voice Chat

An interactive voice-based AI psychiatrist application that provides mental health support through natural conversations. The application uses advanced AI technologies to understand user concerns and provide empathetic responses.

## Features

- 🎙️ Voice-based interaction
- 🤖 AI-powered responses using Groq LLM
- 🎯 Context-aware conversations
- 🎨 Modern and intuitive user interface
- 🔒 Secure and confidential interactions
- 🎧 High-quality text-to-speech responses

## Technologies Used

- **Backend:**
  - Flask (Python web framework)
  - Faster Whisper (Speech-to-text)
  - Groq LLM (AI responses)
  - Edge-TTS (Text-to-speech)

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript
  - Modern UI/UX design

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Web browser with microphone support
- Groq API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SaiPavankumar22/AI-Psychiatrist.git
   cd AI-Psychiatrist
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your environment variables:
   - Create a `.env` file in the project root
   - Add your Groq API key:
     ```
     GROQ_API_KEY=your_api_key_here
     ```

## Usage

1. Start the Flask application:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Click "Start Recording" to begin your conversation
4. Speak your message
5. Click "Stop Recording" to send your message
6. Wait for the AI's response

## Project Structure

```
AI-Psychiatrist/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── templates/         # HTML templates
│   └── index.html     # Main interface
├── uploads/          # Temporary audio storage
├── .env              # Environment variables (not tracked in git)
├── .gitignore       # Git ignore file
├── LICENSE          # MIT License
└── README.md        # Project documentation
```

## Features in Detail

### Voice Interaction
- Real-time audio recording
- High-quality speech-to-text conversion
- Natural text-to-speech responses

### AI Responses
- Context-aware conversations
- Empathetic and supportive responses
- Maintains conversation history
- Rate-limited to prevent API overuse

### Conversation History Implementation
The application maintains context through a session-based conversation history system:

1. **History Storage:**
   - Uses Flask's session management to store conversation history
   - Each conversation pair (user message + AI response) is stored as a dictionary
   - History is maintained per user session

2. **History Management:**
   - Implements a threshold limit (MAX_HISTORY_LENGTH = 5)
   - Automatically removes oldest conversations when limit is exceeded
   - Preserves recent context while preventing memory overflow

3. **Context Integration:**
   - Formats conversation history into a readable string
   - Prepends history to each new prompt
   - Enables the AI to understand conversation flow and context
   - Helps maintain coherent and contextual responses

4. **Memory Efficiency:**
   - Limits stored conversations to prevent token overflow
   - Balances context retention with API efficiency
   - Optimizes response quality while managing API costs

### User Interface
- Modern and responsive design
- Real-time status updates
- Visual recording indicators
- Mobile-friendly layout

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Groq](https://groq.com) for providing the LLM API
- [Faster Whisper](https://github.com/guillaumekln/faster-whisper) for speech recognition
- [Edge-TTS](https://github.com/rany2/edge-tts) for text-to-speech conversion

## Contact

D.Sai Pavan kumar - [GitHub](https://github.com/SaiPavankumar22)

Project Link: [https://github.com/SaiPavankumar22/AI-Psychiatrist](https://github.com/SaiPavankumar22/AI-Psychiatrist) 