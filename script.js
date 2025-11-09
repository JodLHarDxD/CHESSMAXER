// Chess Game Controller - UPDATED FOR PYTHON BACKEND
// Frontend only - AI logic moved to Python backend
class ChessGame {
    constructor() {
        this.game = new Chess();
        this.selectedSquare = null;
        this.validMoves = [];
        this.boardFlipped = false;
        this.aiDepth = 15;  // Default depth - will be overridden by difficulty
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.aiThinking = false;
        
        // API configuration
        this.apiUrl = 'http://127.0.0.1:5000/api';  // Python Flask backend
        this.backendAvailable = false;
        
        this.pieceSymbols = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        
        this.init();
    }
    
    async init() {
        this.renderBoard();
        this.setupEventListeners();
        await this.checkBackendHealth();
        this.updateStatus();
        this.hideLoading();
    }
    
    async checkBackendHealth() {
        /**
         * Check if Python backend is running and healthy
         * Pings /api/health endpoint
         */
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                this.backendAvailable = data.stockfish_available;
                console.log('Backend health check:', data);
                
                if (!this.backendAvailable) {
                    alert('⚠️ Stockfish engine not found on backend. Please ensure it is installed.');
                }
            }
        } catch (error) {
            console.error('Backend health check failed:', error);
            alert('❌ Cannot connect to Python backend at http://127.0.0.1:5000\n\nMake sure to run: python app.py');
            this.backendAvailable = false;
        }
    }
    
    renderBoard() {
        const board = document.getElementById('chessBoard');
        board.innerHTML = '';
        
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        if (this.boardFlipped) {
            files.reverse();
            ranks.reverse();
        }
        
        ranks.forEach((rank, rankIndex) => {
            files.forEach((file, fileIndex) => {
                const square = document.createElement('div');
                const squareId = file + rank;
                square.classList.add('square');
                square.dataset.square = squareId;
                
                // Add light/dark class
                const isLight = (rankIndex + fileIndex) % 2 === 0;
                square.classList.add(isLight ? 'light' : 'dark');
                
                // Add coordinate labels
                if (rank === (this.boardFlipped ? '8' : '1')) {
                    square.dataset.file = file;
                }
                if (file === (this.boardFlipped ? 'h' : 'a')) {
                    square.dataset.rank = rank;
                }
                
                // Add piece
                const piece = this.game.get(squareId);
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece');
                    pieceElement.textContent = this.pieceSymbols[piece.type.toUpperCase()];
                    if (piece.color === 'b') {
                        pieceElement.textContent = this.pieceSymbols[piece.type.toLowerCase()];
                    }
                    square.appendChild(pieceElement);
                }
                
                square.addEventListener('click', () => this.handleSquareClick(squareId));
                board.appendChild(square);
            });
        });
        
        this.highlightLastMove();
        this.updateCapturedPieces();
    }
    
    handleSquareClick(square) {
        if (this.aiThinking || this.game.game_over()) return;
        
        if (this.selectedSquare) {
            const move = this.validMoves.find(m => m.to === square);
            
            if (move) {
                this.makeMove(move);
            } else {
                this.selectSquare(square);
            }
        } else {
            this.selectSquare(square);
        }
    }
    
    selectSquare(square) {
        this.clearHighlights();
        
        const piece = this.game.get(square);
        
        if (piece && piece.color === 'w') {
            this.selectedSquare = square;
            this.validMoves = this.game.moves({ square: square, verbose: true });
            
            const squareElement = document.querySelector(`[data-square="${square}"]`);
            if (squareElement) {
                squareElement.classList.add('selected');
            }
            
            this.validMoves.forEach(move => {
                const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
                if (targetSquare) {
                    if (move.captured) {
                        targetSquare.classList.add('valid-capture');
                    } else {
                        targetSquare.classList.add('valid-move');
                    }
                }
            });
        } else {
            this.selectedSquare = null;
            this.validMoves = [];
        }
    }
    
    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture');
        });
    }
    
    makeMove(move) {
        const result = this.game.move(move);
    
        if (result) {
            this.playSound();
            this.addToHistory(result);
        
            if (result.captured) {
                const color = result.color === 'w' ? 'black' : 'white';
                this.capturedPieces[color].push(result.captured);
            }
        
            this.selectedSquare = null;
            this.validMoves = [];
            this.renderBoard();
            this.updateStatus();
        
        // ✅ FIX: Set aiThinking to false when player makes a move
            this.aiThinking = false;
        
            if (this.game.game_over()) {
                this.handleGameOver();
            } else if (this.game.turn() === 'b') {
            // AI's turn
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }

    async makeAIMove() {
        if (this.game.game_over() || this.aiThinking) return;
    
        this.aiThinking = true;
        this.updateStatus('AI is thinking...');
    
        try {
            const move = await this.getBackendMove();
        
            if (move) {
                this.makeMove(move);
            } else {
                console.error('No valid move returned from backend');
                this.aiThinking = false;
                this.updateStatus();  // ✅ Reset status
            }
        } catch (error) {
            console.error('AI move error:', error);
            this.aiThinking = false;
            this.updateStatus();  // ✅ Reset status
            console.error('Full error:', error);
        }
    }


    async getBackendMove() {
        try {
            const fen = this.game.fen();
    
            // Map current aiDepth to difficulty
            let difficulty = 'medium';
            if (this.aiDepth <= 5) difficulty = 'easy';
            else if (this.aiDepth <= 10) difficulty = 'medium';
            else if (this.aiDepth <= 15) difficulty = 'hard';
            else difficulty = 'expert';
    
            console.log('Requesting move from backend:', { fen, difficulty });
    
        // ✅ ADD TIMEOUT - Max 15 seconds for any request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.warn('Request timeout - took too long');
            }, 15000);  // 15 seconds max
        
            const response = await fetch(`${this.apiUrl}/move/difficulty`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fen: fen,
                    difficulty: difficulty
                }),
                signal: controller.signal  // ✅ ADD THIS
            });
        
            clearTimeout(timeoutId);  // ✅ Clear timeout if response comes back
    
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Backend error');
            }
    
            const data = await response.json();
            console.log('Backend response:', data);
    
            // Parse move string (e.g., "e2e4") into move object
            const moveString = data.move;
            const moves = this.game.moves({ verbose: true });
            const move = moves.find(m => 
                m.from + m.to === moveString || 
                m.from + m.to + (m.promotion || '') === moveString
            );
    
            if (!move) {
                console.error('Could not parse move:', moveString);
                return null;
            }
    
            return move;
        } catch (error) {
            console.error('Failed to get move from backend:', error);
        
            // ✅ Handle timeout gracefully
            if (error.name === 'AbortError') {
                console.error('Request timed out after 15 seconds');
                alert('AI is taking too long. Try reducing difficulty level.');
            }
        
            throw error;
        }
    }


    highlightLastMove() {
        const history = this.game.history({ verbose: true });
        if (history.length > 0) {
            const lastMove = history[history.length - 1];
            const fromSquare = document.querySelector(`[data-square="${lastMove.from}"]`);
            const toSquare = document.querySelector(`[data-square="${lastMove.to}"]`);
            
            if (fromSquare) fromSquare.classList.add('last-move');
            if (toSquare) toSquare.classList.add('last-move');
        }
        
        if (this.game.in_check()) {
            const turn = this.game.turn();
            const kingSquare = this.findKingSquare(turn);
            if (kingSquare) {
                const kingElement = document.querySelector(`[data-square="${kingSquare}"]`);
                if (kingElement) kingElement.classList.add('check');
            }
        }
    }
    
    findKingSquare(color) {
        const board = this.game.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.type === 'k' && piece.color === color) {
                    const files = 'abcdefgh';
                    return files[j] + (8 - i);
                }
            }
        }
        return null;
    }
    
    updateStatus(customMessage = null) {
        const statusElement = document.getElementById('statusMessage');
        const whiteCard = document.getElementById('playerWhite');
        const blackCard = document.getElementById('playerBlack');
        const whiteStatus = whiteCard.querySelector('.player-status');
        const blackStatus = blackCard.querySelector('.player-status');
        
        statusElement.classList.remove('check', 'checkmate', 'stalemate');
        whiteCard.classList.remove('active');
        blackCard.classList.remove('active');
        
        if (customMessage) {
            statusElement.textContent = customMessage;
            blackCard.classList.add('active');
            blackStatus.textContent = 'Thinking...';
            whiteStatus.textContent = 'Waiting...';
            return;
        }
        
        if (this.game.in_checkmate()) {
            const winner = this.game.turn() === 'w' ? 'Black' : 'White';
            statusElement.textContent = `Checkmate! ${winner} wins!`;
            statusElement.classList.add('checkmate');
            whiteStatus.textContent = winner === 'White' ? 'Winner!' : 'Defeated';
            blackStatus.textContent = winner === 'Black' ? 'Winner!' : 'Defeated';
        } else if (this.game.in_stalemate()) {
            statusElement.textContent = 'Stalemate! Draw.';
            statusElement.classList.add('stalemate');
            whiteStatus.textContent = 'Draw';
            blackStatus.textContent = 'Draw';
        } else if (this.game.in_draw()) {
            statusElement.textContent = 'Draw by repetition or 50-move rule.';
            statusElement.classList.add('stalemate');
            whiteStatus.textContent = 'Draw';
            blackStatus.textContent = 'Draw';
        } else if (this.game.in_check()) {
            const player = this.game.turn() === 'w' ? 'White' : 'Black';
            statusElement.textContent = `Check! ${player} to move.`;
            statusElement.classList.add('check');
            
            if (this.game.turn() === 'w') {
                whiteCard.classList.add('active');
                whiteStatus.textContent = 'In check!';
                blackStatus.textContent = 'Waiting...';
            } else {
                blackCard.classList.add('active');
                blackStatus.textContent = 'In check!';
                whiteStatus.textContent = 'Waiting...';
            }
        } else {
            const player = this.game.turn() === 'w' ? 'White' : 'Black';
            statusElement.textContent = `${player} to move`;
            
            if (this.game.turn() === 'w') {
                whiteCard.classList.add('active');
                whiteStatus.textContent = 'Your turn';
                blackStatus.textContent = 'Waiting...';
            } else {
                blackCard.classList.add('active');
                blackStatus.textContent = 'Thinking...';
                whiteStatus.textContent = 'Waiting...';
            }
        }
    }
    
    handleGameOver() {
        this.clearHighlights();
        
        if (this.game.in_checkmate()) {
            const winner = this.game.turn() === 'w' ? 'Black (AI)' : 'White (You)';
            setTimeout(() => {
                alert(`Checkmate! ${winner} wins!`);
            }, 300);
        } else if (this.game.in_stalemate()) {
            setTimeout(() => {
                alert('Game Over: Stalemate!');
            }, 300);
        } else if (this.game.in_draw()) {
            setTimeout(() => {
                alert('Game Over: Draw!');
            }, 300);
        }
    }
    
    addToHistory(move) {
        this.moveHistory.push(move);
        this.updateMoveHistory();
    }
    
    updateMoveHistory() {
        const historyElement = document.getElementById('moveHistory');
        
        if (this.moveHistory.length === 0) {
            historyElement.innerHTML = '<div class="no-moves">No moves yet</div>';
            return;
        }
        
        let html = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            html += `
                <div class="move-pair">
                    <span class="move-number">${moveNumber}.</span>
                    <span class="move-text">${whiteMove.san}</span>
                    ${blackMove ? `<span class="move-text">${blackMove.san}</span>` : '<span></span>'}
                </div>
            `;
        }
        
        historyElement.innerHTML = html;
        historyElement.scrollTop = historyElement.scrollHeight;
    }
    
    updateCapturedPieces() {
        const whiteElement = document.getElementById('capturedWhite');
        const blackElement = document.getElementById('capturedBlack');
        
        whiteElement.innerHTML = this.capturedPieces.white.map(piece => 
            `<span class="captured-piece">${this.pieceSymbols[piece.toLowerCase()]}</span>`
        ).join('');
        
        blackElement.innerHTML = this.capturedPieces.black.map(piece => 
            `<span class="captured-piece">${this.pieceSymbols[piece.toUpperCase()]}</span>`
        ).join('');
    }
    
    newGame() {
        this.game.reset();
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.aiThinking = false;
        this.undoStack = [];
        this.renderBoard();
        this.updateStatus();
        this.updateMoveHistory();
    }
    
    undoMove() {
        if (this.aiThinking || this.moveHistory.length === 0) return;
    
    // ✅ Store current state for redo
        this.undoStack.push({
            game: this.game.fen(),
            moves: [...this.moveHistory],
            captured: JSON.parse(JSON.stringify(this.capturedPieces))
        });
    
    // Undo last two moves (player + AI)
        this.game.undo();
        const undoneMove = this.moveHistory.pop();
        this.undoStack.push(undoneMove);
    
        if (this.moveHistory.length > 0 && this.game.turn() === 'w') {
            this.game.undo();
            const undoneAIMove = this.moveHistory.pop();
            this.undoStack.push(undoneAIMove);
        }
    
    // Recalculate captured pieces
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory.forEach(move => {
            if (move.captured) {
                const color = move.color === 'w' ? 'black' : 'white';
                this.capturedPieces[color].push(move.captured);
            }
        });
    
        this.renderBoard();
        this.updateStatus();
        this.updateMoveHistory();
    }

    redoMove() {
        if (this.aiThinking || this.undoStack.length === 0) return;
    
    // Get the last undone state
        const lastState = this.undoStack.pop();
    
        if (!lastState) return;
    
    // If it's a game state, restore it
        if (lastState.game && lastState.moves) {
            this.game = new Chess(lastState.game);
            this.moveHistory = lastState.moves;
            this.capturedPieces = JSON.parse(JSON.stringify(lastState.captured));
        } else {
        // It's a single move, replay it
            this.game.move(lastState);
            this.moveHistory.push(lastState);
        
            if (lastState.captured) {
                const color = lastState.color === 'w' ? 'black' : 'white';
                this.capturedPieces[color].push(lastState.captured);
            }
        }
    
        this.renderBoard();
        this.updateStatus();
        this.updateMoveHistory();
    }

    
    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        this.renderBoard();
    }
    
    setDifficulty(depth) {
        this.aiDepth = depth;
    }
    
    playSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Silent fail if audio not supported
        }
    }
    
    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => {
            if (confirm('Start a new game? Current game will be lost.')) {
                this.newGame();
            }
        });
        
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redoMove();
        });
        
        document.getElementById('flipBoardBtn').addEventListener('click', () => {
            this.flipBoard();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('Reset the game? Current game will be lost.')) {
                this.newGame();
            }
        });
        
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                this.setDifficulty(level);
                
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const descriptions = {
                    5: 'Easy - Depth 5',
                    10: 'Medium - Depth 10',
                    15: 'Hard - Depth 15',
                    20: 'Expert - Depth 20'
                };
                document.getElementById('difficultyDesc').textContent = descriptions[level];
            });
        });
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('hidden');
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
});