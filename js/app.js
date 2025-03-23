function chessTrainer() {
    return {
        // Game state
        gameStarted: false,
        gameEnded: false,
        boardOrientation: 'white', // 'white' or 'black'
        currentCoordinate: '',
        score: 0,
        totalQuestions: 0,
        timer: 0,
        timerInterval: null,
        responseTimes: [],
        lastQuestionTime: null,
        history: [],
        saveStatus: false, // Indicates if save is in progress
        resultSaved: false, // Flag to track if current game result has been saved
        currentCoordinateAttempted: false, // Flag to track if current coordinate has had an incorrect attempt
        
        // Settings
        showCoordinates: false,
        maxQuestions: 10, // Default to 10 rounds
        savedResults: [],
        availableRounds: [5, 10, 15, 20],
        
        // Chess constants
        files: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        ranks: ['1', '2', '3', '4', '5', '6', '7', '8'],
        
        init() {
            // Load saved results from localStorage
            const savedData = localStorage.getItem('chessTrainerResults');
            if (savedData) {
                this.savedResults = JSON.parse(savedData);
            }
            
            // Wait until Alpine is initialized before creating the board
            this.$nextTick(() => {
                if (this.gameStarted) {
                    this.createChessBoard();
                }
            });
        },
        
        startGame(perspective) {
            this.boardOrientation = perspective === 'random' 
                ? (Math.random() < 0.5 ? 'white' : 'black') 
                : perspective;
            
            this.gameStarted = true;
            this.gameEnded = false;
            this.score = 0;
            this.totalQuestions = 0; // Will be incremented in generateNewCoordinate
            this.timer = 0;
            this.responseTimes = [];
            this.history = [];
            this.resultSaved = false; // Reset saved flag for new game
            this.currentCoordinateAttempted = false; // Reset attempt flag
            
            // Start timer
            this.timerInterval = setInterval(() => {
                this.timer++;
            }, 1000);
            
            // Create chessboard (with proper coordinates)
            this.$nextTick(() => {
                this.createChessBoard();
            });
            
            // Generate first coordinate to find
            this.generateNewCoordinate();
        },
        
        createChessBoard() {
            const boardElement = this.$refs.chessboard;
            boardElement.innerHTML = ''; // Clear board
            
            // Set orientation class
            boardElement.className = 'chess-board w-full h-full aspect-square';
            if (this.boardOrientation === 'black') {
                boardElement.classList.add('black');
            }
            
            // Programmatically create the squares with proper coordinates
            for (let rank = 8; rank >= 1; rank--) {
                for (let file = 0; file < 8; file++) {
                    const square = document.createElement('div');
                    square.className = 'square';
                    
                    // Set square color (alternating)
                    // For bottom right corner (h1 at rank=1, file=7) to be white/light
                    if ((rank + file) % 2 === 1) {
                        square.classList.add('dark');
                    } else {
                        square.classList.add('light');
                    }
                    
                    // Set data attributes for the coordinate
                    const fileChar = this.files[file];
                    const coord = fileChar + rank;
                    square.dataset.coord = coord;
                    
                    // Add click handler
                    square.addEventListener('click', () => {
                        this.checkSquare(coord);
                    });
                    
                    // Add coordinate label if enabled
                    if (this.showCoordinates) {
                        const label = document.createElement('span');
                        label.className = 'coord-label';
                        label.textContent = coord;
                        square.appendChild(label);
                    }
                    
                    // Append to board
                    boardElement.appendChild(square);
                }
            }
            
            // Update coordinate visibility if needed
            this.updateCoordinateVisibility();
        },
        
        updateCoordinateVisibility() {
            const board = this.$refs.chessboard;
            const squares = board.querySelectorAll('.square');
            
            squares.forEach(square => {
                const coord = square.dataset.coord;
                
                // Clear existing labels
                const existingLabel = square.querySelector('.coord-label');
                if (existingLabel) {
                    square.removeChild(existingLabel);
                }
                
                // Add new label if needed
                if (this.showCoordinates) {
                    const label = document.createElement('span');
                    label.className = 'coord-label';
                    label.textContent = coord;
                    square.appendChild(label);
                }
            });
        },
        
        endGame() {
            clearInterval(this.timerInterval);
            this.gameEnded = true;
        },
        
        resetGame() {
            this.gameStarted = false;
            this.gameEnded = false;
            this.saveStatus = false; // Reset save status
        },
        
        saveResults() {
            // Prevent duplicate saves
            if (this.resultSaved) {
                alert('This result has already been saved.');
                return;
            }
            
            // Set save status to show indicator
            this.saveStatus = true;
            
            const result = {
                date: new Date().toISOString(),
                orientation: this.boardOrientation.charAt(0).toUpperCase() + this.boardOrientation.slice(1), // Capitalize first letter
                score: this.score,
                total: this.totalQuestions,
                rounds: this.maxQuestions,
                accuracy: this.getAccuracy(),
                avgTime: this.getAverageTime(),
                history: this.history
            };
            
            this.savedResults.push(result);
            this.savedResults.sort((a, b) => 
                (b.score / b.total) - (a.score / a.total) || 
                parseFloat(a.avgTime) - parseFloat(b.avgTime)
            );
            
            // Keep only top 10 results
            if (this.savedResults.length > 10) {
                this.savedResults = this.savedResults.slice(0, 10);
            }
            
            // Save to localStorage
            localStorage.setItem('chessTrainerResults', JSON.stringify(this.savedResults));
            
            // Mark as saved to prevent duplicates
            this.resultSaved = true;
            
            // Simulate a short delay to show the save indicator
            setTimeout(() => {
                this.saveStatus = false;
            }, 1500);
        },
        
        // Remove a record from the high scores
        removeRecord(index) {
            if (confirm('Are you sure you want to remove this record?')) {
                this.savedResults.splice(index, 1);
                localStorage.setItem('chessTrainerResults', JSON.stringify(this.savedResults));
            }
        },
        
        generateNewCoordinate() {
            // Store previous coordinate to avoid duplicates
            const previousCoordinate = this.currentCoordinate;
            
            // Increment the question counter
            this.totalQuestions++;
            
            // Check if we've reached the max questions
            if (this.totalQuestions > this.maxQuestions) {
                this.endGame();
                return;
            }
            
            // Generate a new coordinate that's different from the previous one
            let newCoordinate;
            do {
                const fileIndex = Math.floor(Math.random() * 8);
                const rankIndex = Math.floor(Math.random() * 8);
                newCoordinate = this.files[fileIndex] + this.ranks[rankIndex];
            } while (newCoordinate === previousCoordinate);
            
            // Set the new coordinate
            this.currentCoordinate = newCoordinate;
            
            // Reset the attempt flag for this new coordinate
            this.currentCoordinateAttempted = false;
            
            // Reset the timer for this question
            this.lastQuestionTime = Date.now();
        },
        
        checkSquare(coordinate) {
            // Don't process clicks when the game is over
            if (this.gameEnded) {
                return;
            }
            
            const responseTime = (Date.now() - this.lastQuestionTime) / 1000;
            this.responseTimes.push(responseTime);
            
            const isCorrect = coordinate === this.currentCoordinate;
            
            // Record in history
            this.history.push({
                coordinate: this.currentCoordinate,
                answered: coordinate,
                correct: isCorrect,
                time: responseTime
            });
            
            if (isCorrect) {
                // Only increment score if this is the first attempt for this coordinate
                if (!this.currentCoordinateAttempted) {
                    this.score++;
                }
                
                this.highlightSquare(coordinate, 'correct');
                
                // Check if this was the last question before generating a new one
                if (this.totalQuestions >= this.maxQuestions) {
                    this.endGame();
                } else {
                    setTimeout(() => this.generateNewCoordinate(), 500);
                }
            } else {
                // Mark that this coordinate has been attempted incorrectly
                this.currentCoordinateAttempted = true;
                this.highlightSquare(coordinate, 'incorrect');
            }
        },
        
        highlightSquare(coordinate, type) {
            // Clear any existing highlights
            document.querySelectorAll('.square').forEach(square => {
                square.classList.remove('correct', 'incorrect');
            });
            
            // Find the square element based on coordinate data attribute
            const square = document.querySelector(`.square[data-coord="${coordinate}"]`);
            
            if (square) {
                if (type === 'correct') {
                    square.classList.add('correct');
                } else {
                    square.classList.add('incorrect');
                }
            }
        },
        
        getAccuracy() {
            if (this.totalQuestions === 0) return 0;
            return Math.round((this.score / this.totalQuestions) * 100);
        },
        
        getAverageTime() {
            if (this.responseTimes.length === 0) return 0;
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            return (sum / this.responseTimes.length).toFixed(2);
        },
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    };
}