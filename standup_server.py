from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import session
import random
import string
import time
from collections import defaultdict
import json
import base64

# Initialize SocketIO
socketio = SocketIO()

# Store room data
rooms = defaultdict(lambda: {
    'users': [],
    'speaker_queue': [],
    'current_speaker': None,
    'speaking_start_time': None,
    'break_end_time': None,
    'is_break': False
})

# Store user data
users = {}

def generate_random_name():
    adjectives = ['Happy', 'Brave', 'Clever', 'Gentle', 'Kind', 'Wise', 'Calm', 'Bright', 'Swift', 'Noble']
    animals = ['Turtle', 'Dolphin', 'Eagle', 'Lion', 'Panda', 'Tiger', 'Wolf', 'Bear', 'Fox', 'Hawk']
    number = random.randint(1, 999)
    return f"{random.choice(adjectives)} {random.choice(animals)} #{number}"

def get_or_create_room():
    # Find a room with less than 7 users or create a new one
    for room_id, room_data in rooms.items():
        if len(room_data['users']) < 7:
            return room_id
    
    # Create new room if all rooms are full
    new_room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    rooms[new_room_id] = {
        'users': [],
        'speaker_queue': [],
        'current_speaker': None,
        'speaking_start_time': None,
        'break_end_time': None,
        'is_break': False
    }
    return new_room_id

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    if not user_id:
        return False
    
    # Generate random name for the user
    random_name = generate_random_name()
    users[user_id] = {
        'name': random_name,
        'room': None,
        'is_muted': False
    }
    
    # Assign user to a room
    room_id = get_or_create_room()
    users[user_id]['room'] = room_id
    rooms[room_id]['users'].append(user_id)
    
    # Join the room
    join_room(room_id)
    
    # Emit room info to the user
    emit('room_info', {
        'room_id': room_id,
        'user_name': random_name,
        'queue_position': None,
        'total_users': len(rooms[room_id]['users'])
    })
    
    # Broadcast updated room info to all users in the room
    emit('room_update', {
        'total_users': len(rooms[room_id]['users']),
        'current_speaker': rooms[room_id]['current_speaker'],
        'speaker_queue': [users[uid]['name'] for uid in rooms[room_id]['speaker_queue']]
    }, room=room_id)

@socketio.on('disconnect')
def handle_disconnect():
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if room_id:
        # Remove user from room
        if user_id in rooms[room_id]['users']:
            rooms[room_id]['users'].remove(user_id)
        
        # Remove user from speaker queue
        if user_id in rooms[room_id]['speaker_queue']:
            rooms[room_id]['speaker_queue'].remove(user_id)
        
        # If user was speaking, end their turn
        if rooms[room_id]['current_speaker'] == user_id:
            rooms[room_id]['current_speaker'] = None
            rooms[room_id]['speaking_start_time'] = None
            rooms[room_id]['is_break'] = True
            rooms[room_id]['break_end_time'] = time.time() + 60
        
        # Leave the room
        leave_room(room_id)
        
        # Broadcast updated room info
        emit('room_update', {
            'total_users': len(rooms[room_id]['users']),
            'current_speaker': rooms[room_id]['current_speaker'],
            'speaker_queue': [users[uid]['name'] for uid in rooms[room_id]['speaker_queue']]
        }, room=room_id)
        
        # Clean up empty rooms
        if len(rooms[room_id]['users']) == 0:
            del rooms[room_id]
    
    # Remove user data
    del users[user_id]

@socketio.on('request_speak')
def handle_speak_request():
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if not room_id or room_id not in rooms:
        return
    
    # Add user to speaker queue if not already in it
    if user_id not in rooms[room_id]['speaker_queue']:
        rooms[room_id]['speaker_queue'].append(user_id)
        
        # Emit updated queue position
        emit('queue_update', {
            'position': rooms[room_id]['speaker_queue'].index(user_id) + 1
        })
        
        # Broadcast updated queue to all users
        emit('room_update', {
            'total_users': len(rooms[room_id]['users']),
            'current_speaker': rooms[room_id]['current_speaker'],
            'speaker_queue': [users[uid]['name'] for uid in rooms[room_id]['speaker_queue']]
        }, room=room_id)

@socketio.on('start_speaking')
def handle_start_speaking():
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if not room_id or room_id not in rooms:
        return
    
    # Check if it's user's turn and not in break time
    if (rooms[room_id]['speaker_queue'] and 
        rooms[room_id]['speaker_queue'][0] == user_id and 
        not rooms[room_id]['current_speaker'] and
        not rooms[room_id]['is_break']):
        
        rooms[room_id]['current_speaker'] = user_id
        rooms[room_id]['speaking_start_time'] = time.time()
        
        # Broadcast speaking status
        emit('speaking_status', {
            'speaker': users[user_id]['name'],
            'start_time': rooms[room_id]['speaking_start_time']
        }, room=room_id)

@socketio.on('audio_stream')
def handle_audio_stream(data):
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if not room_id or room_id not in rooms:
        return
    
    # Check if user is the current speaker
    if rooms[room_id]['current_speaker'] == user_id:
        # Broadcast audio to all users in the room except the sender
        emit('audio_stream', {
            'audio': data['audio'],
            'speaker': users[user_id]['name']
        }, room=room_id, include_self=False)

@socketio.on('end_speaking')
def handle_end_speaking():
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if not room_id or room_id not in rooms:
        return
    
    # Check if user is the current speaker
    if rooms[room_id]['current_speaker'] == user_id:
        # Remove user from queue
        if user_id in rooms[room_id]['speaker_queue']:
            rooms[room_id]['speaker_queue'].remove(user_id)
        
        # Clear current speaker
        rooms[room_id]['current_speaker'] = None
        rooms[room_id]['speaking_start_time'] = None
        
        # Set break time
        rooms[room_id]['is_break'] = True
        rooms[room_id]['break_end_time'] = time.time() + 60
        
        # Broadcast speaking end
        emit('speaking_ended', {
            'next_speaker': users[rooms[room_id]['speaker_queue'][0]]['name'] if rooms[room_id]['speaker_queue'] else None,
            'break_end_time': rooms[room_id]['break_end_time']
        }, room=room_id)

@socketio.on('send_reaction')
def handle_reaction(data):
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    room_id = users[user_id]['room']
    if not room_id or room_id not in rooms:
        return
    
    # Broadcast reaction to all users in the room
    emit('reaction', {
        'user': users[user_id]['name'],
        'reaction': data['reaction']
    }, room=room_id)

@socketio.on('toggle_mute')
def handle_toggle_mute():
    user_id = session.get('user_id')
    if not user_id or user_id not in users:
        return
    
    users[user_id]['is_muted'] = not users[user_id]['is_muted']
    emit('mute_status', {
        'is_muted': users[user_id]['is_muted']
    })

def init_app(app):
    socketio.init_app(app) 