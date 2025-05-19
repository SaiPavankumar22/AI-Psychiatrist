// Main JavaScript file for Mind Chill Game Hub
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mind Chill Game Hub loaded!');

    // Game state management
    const gameState = {
        currentGame: null,
        score: 0,
        gameLoop: null,
        gameActive: false,
        highScores: loadHighScores()
    };

    // Bootstrap modal instance
    let gameOverModal;

    // Initialize the game hub
    function init() {
        // Initialize high scores in local storage if not exists
        initHighScores();
        
        // Display high scores on cards
        displayHighScores();
        
        // Add event listeners to game cards
        document.querySelectorAll('.play-btn, .panel-action').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const gameCard = this.closest('.game-card');
                const gameType = gameCard ? gameCard.dataset.game : this.dataset.game;
                startGame(gameType);
            });
        });
        
        // Game cards hover effect
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', function() {
                const gameType = this.dataset.game;
                startGame(gameType);
            });
        });
        
        // Back to menu button
        document.getElementById('back-to-menu').addEventListener('click', backToMenu);
        
        // Restart game button
        document.getElementById('restart-game').addEventListener('click', restartGame);
        
        // Initialize gameOverModal
        gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
        
        // Modal buttons
        document.getElementById('modal-back-to-menu').addEventListener('click', backToMenu);
        document.getElementById('modal-restart-game').addEventListener('click', function() {
            gameOverModal.hide();
            restartGame();
        });

        // Handle keyboard events globally
        window.addEventListener('keydown', handleKeyboardEvents);

        // Handle window resize for canvas resizing
        window.addEventListener('resize', handleResize);
    }

    // Initialize high scores in localStorage
    function initHighScores() {
        if (!localStorage.getItem('mindChillHighScores')) {
            const defaultScores = {
                snake: 0,
                tetris: 0,
                ballDash: 0,
                memoryMatch: 'N/A',
                spaceInvaders: 0,
                targetClick: 0
            };
            localStorage.setItem('mindChillHighScores', JSON.stringify(defaultScores));
        }
    }

    // Load high scores from localStorage
    function loadHighScores() {
        const scoresData = localStorage.getItem('mindChillHighScores');
        return scoresData ? JSON.parse(scoresData) : {
            snake: 0,
            tetris: 0,
            ballDash: 0,
            memoryMatch: 'N/A',
            spaceInvaders: 0,
            targetClick: 0
        };
    }

    // Save high score to localStorage
    function saveHighScore(game, score) {
        const highScores = loadHighScores();
        
        let isNewHighScore = false;
        
        if (game === 'memoryMatch') {
            // For memory match, lower time is better
            if (highScores[game] === 'N/A' || score < highScores[game]) {
                highScores[game] = score;
                isNewHighScore = true;
            }
        } else {
            // For other games, higher score is better
            if (score > highScores[game]) {
                highScores[game] = score;
                isNewHighScore = true;
            }
        }
        
        localStorage.setItem('mindChillHighScores', JSON.stringify(highScores));
        gameState.highScores = highScores;
        
        return isNewHighScore;
    }

    // Display high scores on game cards
    function displayHighScores() {
        const highScores = loadHighScores();
        document.querySelectorAll('.high-score').forEach(scoreElem => {
            const game = scoreElem.dataset.game;
            if (game && highScores[game] !== undefined) {
                scoreElem.textContent = highScores[game];
            }
        });
    }

    // Start a game
    function startGame(gameType) {
        // Hide game cards and show game container
        document.getElementById('game-cards').classList.add('d-none');
        document.getElementById('game-container').classList.remove('d-none');
        
        // Set current game
        gameState.currentGame = gameType;
        gameState.score = 0;
        gameState.gameActive = true;
        
        // Set game title
        const gameTitles = {
            snake: '🐍 Snake',
            tetris: '🧱 Tetris',
            ballDash: '⚽ Ball Dash',
            memoryMatch: '🧠 Memory Match',
            spaceInvaders: '🚀 Space Invaders',
            targetClick: '🎯 Target Click'
        };
        document.getElementById('current-game-title').textContent = gameTitles[gameType];
        
        // Update score display
        updateScoreDisplay();
        
        // Clean up previous game if exists
        if (gameState.gameLoop) {
            cancelAnimationFrame(gameState.gameLoop);
            gameState.gameLoop = null;
        }
        
        // Clear game area
        const gameCanvas = document.getElementById('game-canvas');
        const ctx = gameCanvas.getContext('2d');
        const controlsContainer = document.getElementById('game-controls');
        controlsContainer.innerHTML = '';
        
        // Set up canvas
        setupCanvas(gameCanvas);
        
        // Initialize and start the selected game
        switch (gameType) {
            case 'snake':
                initSnakeGame(gameCanvas, ctx);
                break;
            case 'tetris':
                initTetrisGame(gameCanvas, ctx);
                break;
            case 'ballDash':
                initBallDashGame(gameCanvas, ctx);
                break;
            case 'memoryMatch':
                initMemoryMatchGame(gameCanvas);
                break;
            case 'spaceInvaders':
                initSpaceInvadersGame(gameCanvas, ctx);
                break;
            case 'targetClick':
                initTargetClickGame(gameCanvas, ctx);
                break;
        }
    }

    // Set up canvas with proper dimensions
    function setupCanvas(canvas) {
        const gameArea = document.getElementById('game-area');
        const gameAreaWidth = gameArea.clientWidth;
        const gameAreaHeight = gameArea.clientHeight;
        
        // Set canvas dimensions based on game type
        switch (gameState.currentGame) {
            case 'snake':
                canvas.width = Math.min(400, gameAreaWidth - 20);
                canvas.height = Math.min(400, gameAreaHeight - 20);
                break;
            case 'tetris':
                canvas.width = Math.min(300, gameAreaWidth - 20);
                canvas.height = Math.min(600, gameAreaHeight - 20);
                break;
            case 'ballDash':
                canvas.width = Math.min(480, gameAreaWidth - 20);
                canvas.height = Math.min(320, gameAreaHeight - 20);
                break;
            case 'memoryMatch':
                canvas.width = Math.min(500, gameAreaWidth - 20);
                canvas.height = Math.min(500, gameAreaHeight - 20);
                break;
            case 'spaceInvaders':
                canvas.width = Math.min(480, gameAreaWidth - 20);
                canvas.height = Math.min(480, gameAreaHeight - 20);
                break;
            case 'targetClick':
                canvas.width = Math.min(500, gameAreaWidth - 20);
                canvas.height = Math.min(400, gameAreaHeight - 20);
                break;
            default:
                canvas.width = Math.min(400, gameAreaWidth - 20);
                canvas.height = Math.min(400, gameAreaHeight - 20);
        }
    }

    // Handle window resize
    function handleResize() {
        if (gameState.gameActive && gameState.currentGame) {
            const canvas = document.getElementById('game-canvas');
            setupCanvas(canvas);
            
            // Reinitialize game on resize for certain games that need it
            if (['memoryMatch', 'tetris'].includes(gameState.currentGame)) {
                restartGame();
            }
        }
    }

    // Update score display
    function updateScoreDisplay(score = gameState.score) {
        const scoreDisplay = document.getElementById('score-display');
        if (gameState.currentGame === 'memoryMatch') {
            // For memory match, display time
            const minutes = Math.floor(score / 60).toString().padStart(2, '0');
            const seconds = (score % 60).toString().padStart(2, '0');
            scoreDisplay.textContent = `Time: ${minutes}:${seconds}`;
        } else {
            // For other games, display score
            scoreDisplay.textContent = `Score: ${score}`;
        }
    }

    // Game over handler
    function gameOver() {
        gameState.gameActive = false;
        cancelAnimationFrame(gameState.gameLoop);
        gameState.gameLoop = null;
        
        // Check if it's a high score
        const isHighScore = saveHighScore(gameState.currentGame, gameState.score);
        
        // Update game cards display with new high scores
        displayHighScores();
        
        // Show game over modal
        const finalScoreElem = document.getElementById('final-score');
        const highScoreMessage = document.getElementById('high-score-message');
        
        if (gameState.currentGame === 'memoryMatch') {
            // For memory match, format time
            const minutes = Math.floor(gameState.score / 60).toString().padStart(2, '0');
            const seconds = (gameState.score % 60).toString().padStart(2, '0');
            finalScoreElem.textContent = `${minutes}:${seconds}`;
        } else {
            finalScoreElem.textContent = gameState.score;
        }
        
        if (isHighScore) {
            highScoreMessage.textContent = "New High Sco! 🎉";
            highScoreMessage.className = "mt-3 text-success fw-bold";
        } else {
            const currentHighScore = gameState.highScores[gameState.currentGame];
            if (gameState.currentGame === 'memoryMatch') {
                if (currentHighScore === 'N/A') {
                    highScoreMessage.textContent = "Your first completion! 👏";
                } else {
                    const highMinutes = Math.floor(currentHighScore / 60).toString().padStart(2, '0');
                    const highSeconds = (currentHighScore % 60).toString().padStart(2, '0');
                    highScoreMessage.textContent = `Best Time: ${highMinutes}:${highSeconds}`;
                }
            } else {
                highScoreMessage.textContent = `High Score: ${currentHighScore}`;
            }
            highScoreMessage.className = "mt-3 text-primary";
        }
        
        gameOverModal.show();
    }

    // Back to menu handler
    function backToMenu() {
        // Hide game container and show game cards
        document.getElementById('game-container').classList.add('d-none');
        document.getElementById('game-cards').classList.remove('d-none');
        
        // Clean up current game
        if (gameState.gameLoop) {
            cancelAnimationFrame(gameState.gameLoop);
            gameState.gameLoop = null;
        }
        
        gameState.currentGame = null;
        gameState.gameActive = false;
        
        // Hide modal if it's open
        if (gameOverModal && gameOverModal._isShown) {
            gameOverModal.hide();
        }
        
        // Clear game controls
        document.getElementById('game-controls').innerHTML = '';
    }

    // Restart game handler
    function restartGame() {
        if (gameState.currentGame) {
            startGame(gameState.currentGame);
        }
    }

    // Handle keyboard events
    function handleKeyboardEvents(e) {
        if (!gameState.gameActive) return;
        
        // Escape key to go back to menu
        if (e.key === 'Escape') {
            backToMenu();
            return;
        }
        
        // Game-specific keyboard handlers are implemented in each game's init function
    }

    // Create mobile controls for games that need them
    function createMobileControls(controlsConfig) {
        const controlsContainer = document.getElementById('game-controls');
        const mobileControls = document.createElement('div');
        mobileControls.className = 'mobile-controls';
        
        for (const control of controlsConfig) {
            const btn = document.createElement('div');
            btn.className = 'control-btn';
            btn.textContent = control.icon;
            btn.dataset.action = control.action;
            
            // Attach event listeners
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (control.touchStart) control.touchStart();
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (control.touchEnd) control.touchEnd();
            });
            
            mobileControls.appendChild(btn);
        }
        
        controlsContainer.appendChild(mobileControls);
    }

    // GAME 1: SNAKE
    function initSnakeGame(canvas, ctx) {
        // Game configuration
        const tileSize = 20;
        const tileCount = canvas.width / tileSize;
        
        // Initialize snake
        let snake = [{
            x: Math.floor(tileCount / 2),
            y: Math.floor(tileCount / 2)
        }];
        
        // Initial velocity
        let velocityX = 0;
        let velocityY = -1;
        
        // Next velocity (to prevent 180° turns)
        let nextVelocityX = velocityX;
        let nextVelocityY = velocityY;
        
        // Food position
        let foodX = Math.floor(Math.random() * tileCount);
        let foodY = Math.floor(Math.random() * tileCount);
        
        // Create mobile controls
        createMobileControls([
            {
                icon: '⬆',
                action: 'up',
                touchStart: () => {
                    if (velocityY !== 1) {
                        nextVelocityX = 0;
                        nextVelocityY = -1;
                    }
                }
            },
            {
                icon: '⬅',
                action: 'left',
                touchStart: () => {
                    if (velocityX !== 1) {
                        nextVelocityX = -1;
                        nextVelocityY = 0;
                    }
                }
            },
            {
                icon: '⬇',
                action: 'down',
                touchStart: () => {
                    if (velocityY !== -1) {
                        nextVelocityX = 0;
                        nextVelocityY = 1;
                    }
                }
            },
            {
                icon: '➡',
                action: 'right',
                touchStart: () => {
                    if (velocityX !== -1) {
                        nextVelocityX = 1;
                        nextVelocityY = 0;
                    }
                }
            }
        ]);
        
        // Keyboard event handler for Snake
        const snakeKeyHandler = (e) => {
            if (!gameState.gameActive || gameState.currentGame !== 'snake') return;
            
            // Arrow key controls
            switch(e.key) {
                case 'ArrowUp':
                    if (velocityY !== 1) {
                        nextVelocityX = 0;
                        nextVelocityY = -1;
                    }
                    break;
                case 'ArrowDown':
                    if (velocityY !== -1) {
                        nextVelocityX = 0;
                        nextVelocityY = 1;
                    }
                    break;
                case 'ArrowLeft':
                    if (velocityX !== 1) {
                        nextVelocityX = -1;
                        nextVelocityY = 0;
                    }
                    break;
                case 'ArrowRight':
                    if (velocityX !== -1) {
                        nextVelocityX = 1;
                        nextVelocityY = 0;
                    }
                    break;
            }
        };
        
        window.addEventListener('keydown', snakeKeyHandler);
        
        // Game loop for Snake
        let lastTime = 0;
        let moveInterval = 150; // ms between moves (controls speed)
        let timeSinceLastMove = 0;
        
        function snakeGameLoop(timestamp) {
            if (!gameState.gameActive) {
                window.removeEventListener('keydown', snakeKeyHandler);
                return;
            }
            
            // Calculate time delta
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            timeSinceLastMove += deltaTime;
            
            if (timeSinceLastMove >= moveInterval) {
                timeSinceLastMove = 0;
                
                // Clear canvas
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Apply next velocity
                velocityX = nextVelocityX;
                velocityY = nextVelocityY;
                
                // Move snake
                const headX = snake[0].x + velocityX;
                const headY = snake[0].y + velocityY;
                
                // Check for collisions with walls
                if (headX < 0 || headY < 0 || headX >= tileCount || headY >= tileCount) {
                    gameOver();
                    return;
                }
                
                // Check for collisions with self
                for (let i = 1; i < snake.length; i++) {
                    if (headX === snake[i].x && headY === snake[i].y) {
                        gameOver();
                        return;
                    }
                }
                
                // Add new head
                snake.unshift({x: headX, y: headY});
                
                // Check if snake ate food
                if (headX === foodX && headY === foodY) {
                    // Increase score
                    gameState.score += 10;
                    updateScoreDisplay();
                    
                    // Speed up the snake slightly as it gets longer
                    if (moveInterval > 50) {
                        moveInterval -= 1;
                    }
                    
                    // Generate new food
                    let newFoodPosition = true;
                    while (newFoodPosition) {
                        foodX = Math.floor(Math.random() * tileCount);
                        foodY = Math.floor(Math.random() * tileCount);
                        
                        // Make sure food doesn't spawn on snake
                        newFoodPosition = false;
                        for (let i = 0; i < snake.length; i++) {
                            if (foodX === snake[i].x && foodY === snake[i].y) {
                                newFoodPosition = true;
                                break;
                            }
                        }
                    }
                } else {
                    // Remove tail if snake didn't eat
                    snake.pop();
                }
                
                // Draw food
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(
                    foodX * tileSize + tileSize / 2, 
                    foodY * tileSize + tileSize / 2, 
                    tileSize / 2 - 2, 
                    0, 
                    2 * Math.PI
                );
                ctx.fill();
                
                // Draw snake
                for (let i = 0; i < snake.length; i++) {
                    // Gradient from head to tail
                    const gradientPosition = i / snake.length;
                    const r = Math.floor(27 + gradientPosition * 30);
                    const g = Math.floor(94 + gradientPosition * 100);
                    const b = Math.floor(32 + gradientPosition * 30);
                    
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    
                    // Draw rounded rectangle for snake parts
                    const x = snake[i].x * tileSize;
                    const y = snake[i].y * tileSize;
                    const size = tileSize - 2; // Small gap between segments
                    const radius = tileSize / 4;
                    
                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + size - radius, y);
                    ctx.arcTo(x + size, y, x + size, y + radius, radius);
                    ctx.lineTo(x + size, y + size - radius);
                    ctx.arcTo(x + size, y + size, x + size - radius, y + size, radius);
                    ctx.lineTo(x + radius, y + size);
                    ctx.arcTo(x, y + size, x, y + size - radius, radius);
                    ctx.lineTo(x, y + radius);
                    ctx.arcTo(x, y, x + radius, y, radius);
                    ctx.fill();
                    
                    // Draw eyes on head
                    if (i === 0) {
                        ctx.fillStyle = 'white';
                        
                        // Position eyes based on direction
                        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
                        
                        if (velocityX === 1) { // Right
                            leftEyeX = x + size - tileSize/4;
                            leftEyeY = y + tileSize/4;
                            rightEyeX = x + size - tileSize/4;
                            rightEyeY = y + size - tileSize/4;
                        } else if (velocityX === -1) { // Left
                            leftEyeX = x + tileSize/4;
                            leftEyeY = y + tileSize/4;
                            rightEyeX = x + tileSize/4;
                            rightEyeY = y + size - tileSize/4;
                        } else if (velocityY === -1) { // Up
                            leftEyeX = x + tileSize/4;
                            leftEyeY = y + tileSize/4;
                            rightEyeX = x + size - tileSize/4;
                            rightEyeY = y + tileSize/4;
                        } else { // Down
                            leftEyeX = x + tileSize/4;
                            leftEyeY = y + size - tileSize/4;
                            rightEyeX = x + size - tileSize/4;
                            rightEyeY = y + size - tileSize/4;
                        }
                        
                        const eyeSize = tileSize/6;
                        
                        // Draw eyes
                        ctx.beginPath();
                        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        // Draw pupils
                        ctx.fillStyle = 'black';
                        ctx.beginPath();
                        ctx.arc(leftEyeX, leftEyeY, eyeSize/2, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(rightEyeX, rightEyeY, eyeSize/2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
                
                // Draw border
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }
            
            // Continue game loop
            gameState.gameLoop = requestAnimationFrame(snakeGameLoop);
        }
        
        // Start game loop
        gameState.gameLoop = requestAnimationFrame(snakeGameLoop);
    }
    
    // GAME 2: TETRIS
    function initTetrisGame(canvas, ctx) {
        // Game configuration
        const blockSize = canvas.width / 10;
        const boardWidth = 10;
        const boardHeight = 20;
        
        // Tetromino shapes
        const tetrominoShapes = {
            I: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            J: [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            L: [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            O: [
                [1, 1],
                [1, 1]
            ],
            S: [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            T: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            Z: [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ]
        };
        
        // Tetromino colors
        const tetrominoColors = {
            I: '#00f0f0',
            J: '#0000f0',
            L: '#f0a000',
            O: '#f0f000',
            S: '#00f000',
            T: '#a000f0',
            Z: '#f00000'
        };
        
        // Initialize game board (0 = empty, 1+ = block color index)
        let board = Array(boardHeight).fill().map(() => Array(boardWidth).fill(0));
        
        // Current tetromino
        let currentTetromino = null;
        let currentPosition = { x: 0, y: 0 };
        let currentShape = null;
        let currentType = '';
        
        // Game state
        let dropInterval = 1000; // ms between drops
        let timeSinceLastDrop = 0;
        let lastTime = 0;
        let isPaused = false;
        
        // Spawn a new tetromino
        function spawnTetromino() {
            // Get random tetromino type
            const types = Object.keys(tetrominoShapes);
            currentType = types[Math.floor(Math.random() * types.length)];
            
            // Get shape and set position
            currentShape = tetrominoShapes[currentType];
            currentPosition = {
                x: Math.floor((boardWidth - currentShape[0].length) / 2),
                y: 0
            };
            
            // Check if game over (can't place new tetromino)
            if (!isValidMove(currentPosition.x, currentPosition.y, currentShape)) {
                gameOver();
                return false;
            }
            
            return true;
        }
        
        // Check if move is valid
        function isValidMove(x, y, shape) {
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        // Check if out of bounds
                        if (
                            y + row < 0 ||
                            x + col < 0 ||
                            y + row >= boardHeight ||
                            x + col >= boardWidth
                        ) {
                            return false;
                        }
                        
                        // Check if collides with placed blocks
                        if (board[y + row][x + col]) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        
        // Rotate tetromino
        function rotateTetromino() {
            // Create rotated shape
            const newShape = Array(currentShape[0].length)
                .fill()
                .map(() => Array(currentShape.length).fill(0));
            
            for (let row = 0; row < currentShape.length; row++) {
                for (let col = 0; col < currentShape[row].length; col++) {
                    newShape[col][currentShape.length - 1 - row] = currentShape[row][col];
                }
            }
            
            // Check if rotation is valid
            if (isValidMove(currentPosition.x, currentPosition.y, newShape)) {
                currentShape = newShape;
                return true;
           }
            
            return false;
        }
        
        // Move tetromino
        function moveTetromino(dx, dy) {
            const newX = currentPosition.x + dx;
            const newY = currentPosition.y + dy;
            
            if (isValidMove(newX, newY, currentShape)) {
                currentPosition.x = newX;
                currentPosition.y = newY;
                return true;
            }
            
            // If can't move down, place tetromino
            if (dy > 0) {
                placeTetromino();
                return false;
            }
            
            return false;
        }
        
        // Place tetromino on board
        function placeTetromino() {
            for (let row = 0; row < currentShape.length; row++) {
                for (let col = 0; col < currentShape[row].length; col++) {
                    if (currentShape[row][col]) {
                        const boardY = currentPosition.y + row;
                        const boardX = currentPosition.x + col;
                        board[boardY][boardX] = currentType;
                    }
                }
            }
            
            // Check for completed lines
            checkLines();
            
            // Spawn new tetromino
            return spawnTetromino();
        }
        
        // Check for completed lines
        function checkLines() {
            let linesCleared = 0;
            
            for (let row = boardHeight - 1; row >= 0; row--) {
                if (board[row].every(cell => cell !== 0)) {
                    // Remove the line
                    board.splice(row, 1);
                    // Add new empty line at top
                    board.unshift(Array(boardWidth).fill(0));
                    // Increment lines cleared
                    linesCleared++;
                    // Check same row again (since rows have shifted down)
                    row++;
                }
            }
            
            // Update score based on lines cleared
            if (linesCleared > 0) {
                // Score exponentially more for multiple lines at once
                const points = [0, 100, 300, 500, 800];
                gameState.score += points[linesCleared];
                updateScoreDisplay();
                
                // Speed up game as score increases
                if (gameState.score > 0) {
                    dropInterval = Math.max(100, 1000 - Math.floor(gameState.score / 1000) * 100);
                }
            }
        }
        
        // Hard drop tetromino
        function hardDrop() {
            while (moveTetromino(0, 1)) {
                // Continue moving down until collision
            }
        }
        
        // Create mobile controls
        createMobileControls([
            {
                icon: '⬆',
                action: 'rotate',
                touchStart: () => {
                    rotateTetromino();
                },
                touchEnd: () => {
                    moveTetromino(0, 1);
                }
            },
            {
                icon: '⬇',
                action: 'hardDrop',
                touchStart: () => {
                    hardDrop();
                },
                touchEnd: () => {
                    moveTetromino(0, 1);
                }
            },
            {
                icon: '⬅',
                action: 'moveLeft',
                touchStart: () => {
                    moveTetromino(-1, 0);
                },
                touchEnd: () => {
                    moveTetromino(0, 1);
                }
            },
            {
                icon: '➡',
                action: 'moveRight',
                touchStart: () => {
                    moveTetromino(1, 0);
                },
                touchEnd: () => {
                    moveTetromino(0, 1);
                }
            }
        ]);
                    
        // Game loop
        function tetrisGameLoop(timestamp) {
            if (gameState.gameActive) {
                const deltaTime = (timestamp - lastTime) / 1000;
                lastTime = timestamp;
                
                if (!isPaused) {
                    timeSinceLastDrop += deltaTime;
                    
                    if (timeSinceLastDrop >= dropInterval) {
                        moveTetromino(0, 1);
                        timeSinceLastDrop = 0;
                    }
                }

                // Draw game elements
                ctx.clearRect(0, 0, canvas.width, canvas.height);   
                
                // Draw board
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw tetromino   
                ctx.fillStyle = tetrominoColors[currentType];
                for (let row = 0; row < currentShape.length; row++) {
                    for (let col = 0; col < currentShape[row].length; col++) {
                        if (currentShape[row][col]) {
                            const x = currentPosition.x + col * blockSize;  
                            const y = currentPosition.y + row * blockSize;
                            ctx.fillRect(x, y, blockSize, blockSize);
                        }
                    }
                }   
                
                // Draw next tetromino preview
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Next', canvas.width / 2, 50); 
                
                // Draw score
                ctx.fillStyle = '#fff';
                ctx.font = '20px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('Score: ' + gameState.score, 10, 20);  
                
                // Draw game over message
                if (!gameState.gameActive) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 30px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
                }   

                // Request next frame
                gameState.gameLoop = requestAnimationFrame(tetrisGameLoop);
            }
        }

                // Initialize game
        spawnTetromino();
        gameState.gameLoop = requestAnimationFrame(tetrisGameLoop);
    }                                       

    // GAME 3: BALL DASH
    function initBallDashGame(canvas, ctx) {
        // Game configuration
        const paddleHeight = 80;
        const paddleWidth = 10;
        const ballSize = 10;
        const brickRows = 5;
        const brickCols = 8;
        const brickHeight = 20;
        const brickPadding = 5;
        const brickWidth = (canvas.width - (brickCols + 1) * brickPadding) / brickCols;

        // Game state
        let paddle = {
            x: canvas.width / 2 - paddleWidth / 2,
            y: canvas.height - paddleHeight - 10,
            width: paddleWidth,
            height: paddleHeight,
            speed: 8
        };

        let ball = {
            x: canvas.width / 2,
            y: canvas.height - paddleHeight - 20,
            size: ballSize,
            speed: 5,
            dx: 5,
            dy: -5
        };

        let bricks = [];
        let gameActive = true;

        // Initialize bricks
        function initBricks() {
            for (let row = 0; row < brickRows; row++) {
                bricks[row] = [];
                for (let col = 0; col < brickCols; col++) {
                    bricks[row][col] = {
                        x: col * (brickWidth + brickPadding) + brickPadding,
                        y: row * (brickHeight + brickPadding) + brickPadding + 50,
                        width: brickWidth,
                        height: brickHeight,
                        status: 1
                    };
                }
            }
        }

        // Create mobile controls
        createMobileControls([
            {
                icon: '⬅',
                action: 'moveLeft',
                touchStart: () => {
                    if (paddle.x > 0) {
                        paddle.x -= paddle.speed;
                    }
                }
            },
            {
                icon: '➡',
                action: 'moveRight',
                touchStart: () => {
                    if (paddle.x < canvas.width - paddle.width) {
                        paddle.x += paddle.speed;
                    }
                }
            }
        ]);

        // Keyboard controls
        const ballDashKeyHandler = (e) => {
            if (!gameState.gameActive || gameState.currentGame !== 'ballDash') return;

            if (e.key === 'ArrowLeft' && paddle.x > 0) {
                paddle.x -= paddle.speed;
            } else if (e.key === 'ArrowRight' && paddle.x < canvas.width - paddle.width) {
                paddle.x += paddle.speed;
            }
        };

        window.addEventListener('keydown', ballDashKeyHandler);

        // Collision detection
        function checkCollision() {
            // Wall collision
            if (ball.x + ball.size > canvas.width || ball.x - ball.size < 0) {
                ball.dx = -ball.dx;
            }
            if (ball.y - ball.size < 0) {
                ball.dy = -ball.dy;
            }

            // Paddle collision
            if (
                ball.y + ball.size > paddle.y &&
                ball.x > paddle.x &&
                ball.x < paddle.x + paddle.width
            ) {
                ball.dy = -ball.dy;
                // Add some randomness to the bounce
                ball.dx = ball.dx + (Math.random() - 0.5) * 2;
            }

            // Brick collision
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    const brick = bricks[row][col];
                    if (brick.status === 1) {
                        if (
                            ball.x > brick.x &&
                            ball.x < brick.x + brick.width &&
                            ball.y > brick.y &&
                            ball.y < brick.y + brick.height
                        ) {
                            ball.dy = -ball.dy;
                            brick.status = 0;
                            gameState.score += 10;
                            updateScoreDisplay();
                        }
                    }
                }
            }

            // Game over condition
            if (ball.y + ball.size > canvas.height) {
                gameOver();
                return;
            }

            // Win condition
            let remainingBricks = 0;
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    remainingBricks += bricks[row][col].status;
                }
            }
            if (remainingBricks === 0) {
                gameOver();
                return;
            }
        }

        // Game loop
        function ballDashGameLoop() {
            if (!gameState.gameActive) {
                window.removeEventListener('keydown', ballDashKeyHandler);
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw paddle
            ctx.fillStyle = '#0095DD';
            ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
            ctx.fillStyle = '#0095DD';
            ctx.fill();
            ctx.closePath();

            // Draw bricks
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    if (bricks[row][col].status === 1) {
                        ctx.fillStyle = '#0095DD';
                        ctx.fillRect(
                            bricks[row][col].x,
                            bricks[row][col].y,
                            bricks[row][col].width,
                            bricks[row][col].height
                        );
                    }
                }
            }

            // Move ball
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Check collisions
            checkCollision();

            // Continue game loop
            gameState.gameLoop = requestAnimationFrame(ballDashGameLoop);
        }

        // Initialize game
        initBricks();
        gameState.gameLoop = requestAnimationFrame(ballDashGameLoop);
    }

    // GAME 4: MEMORY MATCH
    function initMemoryMatchGame(canvas) {
        const gameContainer = document.getElementById('game-container');
        const memoryGrid = document.createElement('div');
        memoryGrid.className = 'memory-grid';
        gameContainer.appendChild(memoryGrid);

        // Game configuration
        const gridSize = 4;
        const totalCards = gridSize * gridSize;
        const cardTypes = ['🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎫', '🎪'];
        let cards = [];
        let flippedCards = [];
        let matchedPairs = 0;
        let gameStartTime = null;
        let gameTimer = null;

        // Create cards
        function createCards() {
            // Create pairs of cards
            const cardPairs = [...cardTypes, ...cardTypes];
            // Shuffle cards
            for (let i = cardPairs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
            }

            // Create card elements
            cardPairs.forEach((type, index) => {
                const card = document.createElement('div');
                card.className = 'memory-card';
                card.dataset.cardType = type;
                card.dataset.cardIndex = index;
                card.innerHTML = '<div class="card-inner"><div class="card-front">?</div><div class="card-back">' + type + '</div></div>';
                card.addEventListener('click', flipCard);
                memoryGrid.appendChild(card);
                cards.push(card);
            });
        }

        // Flip card
        function flipCard() {
            if (flippedCards.length === 2) return;
            if (this.classList.contains('flipped')) return;

            // Start timer on first card flip
            if (!gameStartTime) {
                gameStartTime = Date.now();
                startTimer();
            }

            this.classList.add('flipped');
            flippedCards.push(this);

            if (flippedCards.length === 2) {
                setTimeout(checkMatch, 1000);
            }
        }

        // Check for match
        function checkMatch() {
            const [card1, card2] = flippedCards;
            const match = card1.dataset.cardType === card2.dataset.cardType;

            if (match) {
                card1.classList.add('matched');
                card2.classList.add('matched');
                matchedPairs++;

                if (matchedPairs === cardTypes.length) {
                    endGame();
                }
            } else {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }

            flippedCards = [];
        }

        // Start timer
        function startTimer() {
            gameTimer = setInterval(() => {
                const currentTime = Date.now();
                const elapsedTime = Math.floor((currentTime - gameStartTime) / 1000);
                gameState.score = elapsedTime;
                updateScoreDisplay();
            }, 1000);
        }

        // End game
        function endGame() {
            clearInterval(gameTimer);
            gameOver();
        }

        // Initialize game
        createCards();
    }

    // GAME 5: SPACE INVADERS
    function initSpaceInvadersGame(canvas, ctx) {
        // Game configuration
        const playerWidth = 50;
        const playerHeight = 20;
        const bulletSize = 5;
        const enemyWidth = 40;
        const enemyHeight = 30;
        const enemyRows = 5;
        const enemyCols = 8;
        const enemyPadding = 20;

        // Game state
        let player = {
            x: canvas.width / 2 - playerWidth / 2,
            y: canvas.height - playerHeight - 10,
            width: playerWidth,
            height: playerHeight,
            speed: 5
        };

        let bullets = [];
        let enemies = [];
        let enemyDirection = 1;
        let enemySpeed = 1;
        let lastEnemyMove = 0;
        let enemyMoveInterval = 1000;

        // Initialize enemies
        function initEnemies() {
            for (let row = 0; row < enemyRows; row++) {
                enemies[row] = [];
                for (let col = 0; col < enemyCols; col++) {
                    enemies[row][col] = {
                        x: col * (enemyWidth + enemyPadding) + enemyPadding,
                        y: row * (enemyHeight + enemyPadding) + enemyPadding,
                        width: enemyWidth,
                        height: enemyHeight,
                        status: 1
                    };
                }
            }
        }

        // Create mobile controls
        createMobileControls([
            {
                icon: '⬅',
                action: 'moveLeft',
                touchStart: () => {
                    if (player.x > 0) {
                        player.x -= player.speed;
                    }
                }
            },
            {
                icon: '➡',
                action: 'moveRight',
                touchStart: () => {
                    if (player.x < canvas.width - player.width) {
                        player.x += player.speed;
                    }
                }
            },
            {
                icon: '⬆',
                action: 'shoot',
                touchStart: () => {
                    shoot();
                }
            }
        ]);

        // Keyboard controls
        const spaceInvadersKeyHandler = (e) => {
            if (!gameState.gameActive || gameState.currentGame !== 'spaceInvaders') return;

            if (e.key === 'ArrowLeft' && player.x > 0) {
                player.x -= player.speed;
            } else if (e.key === 'ArrowRight' && player.x < canvas.width - player.width) {
                player.x += player.speed;
            } else if (e.key === ' ') {
                shoot();
            }
        };

        window.addEventListener('keydown', spaceInvadersKeyHandler);

        // Shoot bullet
        function shoot() {
            bullets.push({
                x: player.x + player.width / 2 - bulletSize / 2,
                y: player.y,
                width: bulletSize,
                height: bulletSize,
                speed: 7
            });
        }

        // Move enemies
        function moveEnemies(timestamp) {
            if (timestamp - lastEnemyMove > enemyMoveInterval) {
                let shouldChangeDirection = false;

                // Check if any enemy hits the wall
                for (let row = 0; row < enemyRows; row++) {
                    for (let col = 0; col < enemyCols; col++) {
                        if (enemies[row][col].status === 1) {
                            if (
                                (enemyDirection === 1 && enemies[row][col].x + enemyWidth >= canvas.width) ||
                                (enemyDirection === -1 && enemies[row][col].x <= 0)
                            ) {
                                shouldChangeDirection = true;
                                break;
                            }
                        }
                    }
                    if (shouldChangeDirection) break;
                }

                // Move enemies
                if (shouldChangeDirection) {
                    enemyDirection *= -1;
                    for (let row = 0; row < enemyRows; row++) {
                        for (let col = 0; col < enemyCols; col++) {
                            if (enemies[row][col].status === 1) {
                                enemies[row][col].y += 20;
                            }
                        }
                    }
                } else {
                    for (let row = 0; row < enemyRows; row++) {
                        for (let col = 0; col < enemyCols; col++) {
                            if (enemies[row][col].status === 1) {
                                enemies[row][col].x += enemySpeed * enemyDirection;
                            }
                        }
                    }
                }

                lastEnemyMove = timestamp;
            }
        }

        // Check collisions
        function checkCollisions() {
            // Bullet-enemy collisions
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                for (let row = 0; row < enemyRows; row++) {
                    for (let col = 0; col < enemyCols; col++) {
                        const enemy = enemies[row][col];
                        if (enemy.status === 1) {
                            if (
                                bullet.x < enemy.x + enemy.width &&
                                bullet.x + bullet.width > enemy.x &&
                                bullet.y < enemy.y + enemy.height &&
                                bullet.y + bullet.height > enemy.y
                            ) {
                                enemy.status = 0;
                                bullets.splice(i, 1);
                                gameState.score += 10;
                                updateScoreDisplay();
                                break;
                            }
                        }
                    }
                }
            }

            // Check if enemies reached bottom
            for (let row = 0; row < enemyRows; row++) {
                for (let col = 0; col < enemyCols; col++) {
                    if (enemies[row][col].status === 1) {
                        if (enemies[row][col].y + enemyHeight >= player.y) {
                            gameOver();
                            return;
                        }
                    }
                }
            }

            // Check if all enemies are destroyed
            let remainingEnemies = 0;
            for (let row = 0; row < enemyRows; row++) {
                for (let col = 0; col < enemyCols; col++) {
                    remainingEnemies += enemies[row][col].status;
                }
            }
            if (remainingEnemies === 0) {
                gameOver();
                return;
            }
        }

        // Game loop
        function spaceInvadersGameLoop(timestamp) {
            if (!gameState.gameActive) {
                window.removeEventListener('keydown', spaceInvadersKeyHandler);
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw player
            ctx.fillStyle = '#0095DD';
            ctx.fillRect(player.x, player.y, player.width, player.height);

            // Draw and move bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                ctx.fillStyle = '#0095DD';
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                bullet.y -= bullet.speed;

                // Remove bullets that are off screen
                if (bullet.y + bullet.height < 0) {
                    bullets.splice(i, 1);
                }
            }

            // Draw enemies
            for (let row = 0; row < enemyRows; row++) {
                for (let col = 0; col < enemyCols; col++) {
                    if (enemies[row][col].status === 1) {
                        ctx.fillStyle = '#FF0000';
                        ctx.fillRect(
                            enemies[row][col].x,
                            enemies[row][col].y,
                            enemies[row][col].width,
                            enemies[row][col].height
                        );
                    }
                }
            }

            // Move enemies
            moveEnemies(timestamp);

            // Check collisions
            checkCollisions();

            // Continue game loop
            gameState.gameLoop = requestAnimationFrame(spaceInvadersGameLoop);
        }

        // Initialize game
        initEnemies();
        gameState.gameLoop = requestAnimationFrame(spaceInvadersGameLoop);
    }

    // GAME 6: TARGET CLICK
    function initTargetClickGame(canvas, ctx) {
        // Game configuration
        const targetRadius = 30;
        const targetLifetime = 2000; // ms
        const spawnInterval = 1000; // ms
        let targets = [];
        let lastSpawnTime = 0;
        let gameStartTime = Date.now();

        // Create target
        function createTarget() {
            const x = Math.random() * (canvas.width - targetRadius * 2) + targetRadius;
            const y = Math.random() * (canvas.height - targetRadius * 2) + targetRadius;
            targets.push({
                x,
                y,
                radius: targetRadius,
                createdAt: Date.now(),
                points: 100
            });
        }

        // Handle click
        function handleClick(e) {
            if (!gameState.gameActive) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            for (let i = targets.length - 1; i >= 0; i--) {
                const target = targets[i];
                const distance = Math.sqrt(
                    Math.pow(clickX - target.x, 2) + Math.pow(clickY - target.y, 2)
                );

                if (distance <= target.radius) {
                    // Calculate points based on time remaining
                    const timeRemaining = targetLifetime - (Date.now() - target.createdAt);
                    const points = Math.max(10, Math.floor(timeRemaining / targetLifetime * 100));
                    gameState.score += points;
                    updateScoreDisplay();
                    targets.splice(i, 1);
                    break;
                }
            }
        }

        // Add click event listener
        canvas.addEventListener('click', handleClick);

        // Game loop
        function targetClickGameLoop(timestamp) {
            if (!gameState.gameActive) {
                canvas.removeEventListener('click', handleClick);
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Spawn new targets
            if (timestamp - lastSpawnTime > spawnInterval) {
                createTarget();
                lastSpawnTime = timestamp;
            }

            // Draw and update targets
            for (let i = targets.length - 1; i >= 0; i--) {
                const target = targets[i];
                const age = Date.now() - target.createdAt;

                // Remove expired targets
                if (age > targetLifetime) {
                    targets.splice(i, 1);
                    continue;
                }

                // Calculate target size based on remaining time
                const remainingTime = targetLifetime - age;
                const sizeMultiplier = remainingTime / targetLifetime;
                const currentRadius = target.radius * sizeMultiplier;

                // Draw target
                ctx.beginPath();
                ctx.arc(target.x, target.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 0, 0, ${sizeMultiplier})`;
                ctx.fill();
                ctx.closePath();

                // Draw target ring
                ctx.beginPath();
                ctx.arc(target.x, target.y, currentRadius, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            }

            // Draw score
            ctx.fillStyle = '#000';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Score: ${gameState.score}`, 10, 30);

            // Continue game loop
            gameState.gameLoop = requestAnimationFrame(targetClickGameLoop);
        }

        // Start game loop
        gameState.gameLoop = requestAnimationFrame(targetClickGameLoop);
    }

    // Initialize the game hub
    init();
});



