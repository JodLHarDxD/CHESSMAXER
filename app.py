"""
CHESSMAXER Backend - AI Engine Server
Main Flask application for chess AI using Stockfish
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from stockfish import Stockfish
import os
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable cross-origin requests from frontend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Stockfish engine
# Note: Make sure stockfish.exe or stockfish binary is in the project root
# Download from: https://stockfishchess.org/download/

try:
    # Direct path to your Stockfish
    stockfish_path = r'D:\projects\chess-app\backend\stockfish.exe'
    
    if os.path.exists(stockfish_path):
        stockfish = Stockfish(path=stockfish_path)
        logger.info(f"✅ Stockfish initialized at: {stockfish_path}")
    else:
        logger.error(f"❌ Stockfish not found at: {stockfish_path}")
        stockfish = None

except Exception as e:
    logger.error(f"❌ Error initializing Stockfish: {e}")
    stockfish = None



@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify backend is running
    Returns: JSON with status and Stockfish availability
    """
    return jsonify({
        'status': 'healthy',
        'stockfish_available': stockfish is not None,
        'backend': 'CHESSMAXER Python Backend'
    }), 200


@app.route('/api/move', methods=['POST'])
def get_best_move():
    """
    Get best chess move from Stockfish engine
    
    Request body:
    {
        "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4",
        "depth": 20  # optional, default is 15
    }
    
    Response:
    {
        "move": "e1g1",
        "best_move": "e1g1",
        "depth_used": 20,
        "evaluation": 0.5
    }
    """
    try:
        if not stockfish:
            return jsonify({'error': 'Stockfish engine not available'}), 503
        
        data = request.get_json()
        
        if not data or 'fen' not in data:
            return jsonify({'error': 'FEN position required'}), 400
        
        fen = data['fen']
        depth = data.get('depth', 15)  # Default depth of 15 moves
        
        # Validate FEN
        try:
            stockfish.set_fen_position(fen)
        except ValueError as e:
            return jsonify({'error': f'Invalid FEN position: {str(e)}'}), 400
        
        # Set search depth
        stockfish.set_depth(depth)
        
        # Get best move from Stockfish
        best_move = stockfish.get_best_move()
        
        if not best_move:
            return jsonify({'error': 'No legal moves available'}), 400
        
        # Get evaluation (if available)
        try:
            evaluation = stockfish.get_evaluation()
        except:
            evaluation = None
        
        logger.info(f"Best move for FEN (depth {depth}): {best_move}")
        
        return jsonify({
            'move': best_move,
            'best_move': best_move,
            'depth_used': depth,
            'evaluation': evaluation
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_best_move: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/move/difficulty', methods=['POST'])
def get_move_by_difficulty():
    """
    Get best move with difficulty level (simplified API)
    
    Request body:
    {
        "fen": "fen_string",
        "difficulty": "easy|medium|hard|expert"
    }
    
    Difficulty mapping to depth:
    - easy: depth 5
    - medium: depth 15
    - hard: depth 50
    - expert: depth 150
    """
    try:
        if not stockfish:
            return jsonify({'error': 'Stockfish engine not available'}), 503
        
        data = request.get_json()
        
        if not data or 'fen' not in data:
            return jsonify({'error': 'FEN position required'}), 400
        
        fen = data['fen']
        difficulty = data.get('difficulty', 'medium').lower()
        
        # Map difficulty to depth
        difficulty_map = {
            'easy': 5,
            'medium': 10,
            'hard': 15,
            'expert': 20
        }
        
        if difficulty not in difficulty_map:
            return jsonify({'error': 'Invalid difficulty level'}), 400
        
        depth = difficulty_map[difficulty]
        
        # Set position and depth
        try:
            stockfish.set_fen_position(fen)
        except ValueError as e:
            return jsonify({'error': f'Invalid FEN: {str(e)}'}), 400
        
        stockfish.set_depth(depth)
        best_move = stockfish.get_best_move()
        
        if not best_move:
            return jsonify({'error': 'No legal moves available'}), 400
        
        return jsonify({
            'move': best_move,
            'difficulty': difficulty,
            'depth': depth
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_move_by_difficulty: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/evaluate', methods=['POST'])
def evaluate_position():
    """
    Evaluate a chess position
    
    Request body:
    {
        "fen": "fen_string",
        "depth": 20
    }
    
    Response:
    {
        "evaluation": {"type": "cp", "value": 35},
        "best_move": "e2e4",
        "depth": 20
    }
    """
    try:
        if not stockfish:
            return jsonify({'error': 'Stockfish engine not available'}), 503
        
        data = request.get_json()
        
        if not data or 'fen' not in data:
            return jsonify({'error': 'FEN position required'}), 400
        
        fen = data['fen']
        depth = data.get('depth', 20)
        
        try:
            stockfish.set_fen_position(fen)
        except ValueError as e:
            return jsonify({'error': f'Invalid FEN: {str(e)}'}), 400
        
        stockfish.set_depth(depth)
        
        evaluation = stockfish.get_evaluation()
        best_move = stockfish.get_best_move()
        
        return jsonify({
            'evaluation': evaluation,
            'best_move': best_move,
            'depth': depth
        }), 200
    
    except Exception as e:
        logger.error(f"Error in evaluate_position: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/valid-moves', methods=['POST'])
def get_valid_moves():
    """
    Get all valid moves for a position
    
    Request body:
    {
        "fen": "fen_string"
    }
    
    Response:
    {
        "valid_moves": ["e2e4", "e2e3", ...],
        "move_count": 20
    }
    """
    try:
        if not stockfish:
            return jsonify({'error': 'Stockfish engine not available'}), 503
        
        data = request.get_json()
        
        if not data or 'fen' not in data:
            return jsonify({'error': 'FEN position required'}), 400
        
        fen = data['fen']
        
        try:
            stockfish.set_fen_position(fen)
        except ValueError as e:
            return jsonify({'error': f'Invalid FEN: {str(e)}'}), 400
        
        # Get all legal moves
        valid_moves = stockfish.get_legal_moves()
        
        return jsonify({
            'valid_moves': valid_moves,
            'move_count': len(valid_moves)
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_valid_moves: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/info', methods=['GET'])
def get_engine_info():
    """
    Get information about the Stockfish engine
    
    Response:
    {
        "engine_name": "Stockfish 16.1",
        "version": "16.1",
        "available_endpoints": [...]
    }
    """
    if not stockfish:
        return jsonify({'error': 'Stockfish engine not available'}), 503
    
    return jsonify({
        'engine_name': 'Stockfish',
        'available_endpoints': [
            '/api/health',
            '/api/move',
            '/api/move/difficulty',
            '/api/evaluate',
            '/api/valid-moves',
            '/api/info'
        ]
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("CHESSMAXER Python Backend")
    print("=" * 60)
    print("Starting Flask server on http://127.0.0.1:5000")
    print("Frontend should connect to: http://127.0.0.1:5000/api/move")
    print("=" * 60)
    
    # Run Flask app
    # Set debug=False for production
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True,
        threaded=True
    )