# MindMate - Your Personal Mental Health Companion

MindMate is a comprehensive mental health application that combines diary writing, mood tracking, and AI-powered chat support to help users maintain their mental well-being.

## Features

### 1. Personal Diary
- Create and manage daily diary entries
- Upload and attach photos to entries
- Track your mood for each entry
- Browse entries by year
- Beautiful polaroid-style photo gallery
- Secure and private journaling experience

### 2. AI Chat Support
- Voice and text-based chat interface
- Real-time AI responses using advanced language models
- Emotionally intelligent conversations
- Voice-to-text and text-to-speech capabilities
- Conversation history tracking

### 3. Dashboard
- Quick access to key features
- Mood tracking visualization
- Daily task management
- Activity overview
- Personalized greeting based on time of day

### 4. Stand-up Feature
- Daily mental health check-ins
- Track your emotional state
- Set daily intentions
- Monitor progress over time

## Technical Stack

### Frontend
- HTML5, CSS3, JavaScript
- Bootstrap 5 for responsive design
- Custom CSS animations and transitions
- Modern UI/UX design principles

### Backend
- Python Flask framework
- MongoDB database
- JWT authentication
- RESTful API architecture

### AI Integration
- Groq LLM for intelligent responses
- Whisper for voice transcription
- Edge-TTS for text-to-speech conversion

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mindmate.git
cd mindmate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up MongoDB:
- Install MongoDB locally or use MongoDB Atlas
- Create a database named 'mindmate_db'

4. Configure environment variables:
Create a `.env` file with the following variables:
```
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key
```

5. Run the application:
```bash
python app.py
```

## Usage

1. Register a new account or login
2. Access the dashboard for an overview of your mental health journey
3. Use the diary feature to write daily entries and track your mood
4. Engage with the AI chat for support and guidance
5. Use the stand-up feature for daily check-ins

## Security Features

- JWT-based authentication
- Password hashing
- Secure session management
- Protected API endpoints
- Secure file uploads

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for the frontend framework
- Groq for AI language model
- Whisper for voice transcription
- Edge-TTS for text-to-speech conversion

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Future Enhancements

- Mobile application development
- Additional AI models integration
- Enhanced mood tracking analytics
- Social features for community support
- Integration with health tracking devices 