# CHESSMAXER - Python Backend Setup Guide

## 🎯 Project Architecture

**Frontend** (HTML, CSS, JavaScript) → **REST API** → **Python Backend** (Flask + Stockfish)

```
CHESSMAXER/
├── frontend/
│   ├── index.html          # Game UI (unchanged)
│   ├── style.css           # Styling (unchanged)
│   └── script-updated.js   # Updated with API calls
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   └── stockfish.exe       # Stockfish engine (download separately)
└── README.md
```

---

## 📋 Step-by-Step Setup

### Step 1: Install Python Stockfish

**Download Stockfish Binary:**
- Visit: https://stockfishchess.org/download/
- Choose your OS (Windows, Mac, Linux)
- Extract `stockfish.exe` (Windows) or `stockfish` (Mac/Linux)
- Place it in your backend folder

**Verify Installation:**
```bash
# Windows
stockfish.exe --version

# Mac/Linux
./stockfish --version
```

### Step 2: Set Up Python Virtual Environment

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### Step 3: Install Python Dependencies

```bash
# Install required packages
pip install -r requirements.txt

# Verify installation
pip list
```

Should show:
- Flask==3.0.0
- Flask-CORS==4.0.0
- stockfish==3.24.0

### Step 4: Start Python Backend

```bash
# Run Flask app
python app.py

# Expected output:
# ============================================================
# CHESSMAXER Python Backend
# ============================================================
# Starting Flask server on http://127.0.0.1:5000
# Frontend should connect to: http://127.0.0.1:5000/api/move
# ============================================================
```

**Keep this terminal open!** The backend must be running for the game to work.

### Step 5: Update Frontend

1. **Replace `script.js` with `script-updated.js`**
   - Rename: `script-updated.js` → `script.js`
   - Or update the HTML to reference the new file:
   ```html
   <script src="script-updated.js"></script>
   ```

2. **Open `index.html` in Browser**
   - Use a modern browser (Chrome, Firefox, Safari, Edge)
   - The frontend will automatically detect and connect to the backend

---

## 🔌 API Endpoints Reference

### Health Check
```
GET /api/health

Response:
{
    "status": "healthy",
    "stockfish_available": true,
    "backend": "CHESSMAXER Python Backend"
}
```

### Get Best Move (Main Endpoint)
```
POST /api/move/difficulty

Request:
{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "difficulty": "medium"
}

Response:
{
    "move": "e2e4",
    "difficulty": "medium",
    "depth": 15
}
```

### Get Move with Custom Depth
```
POST /api/move

Request:
{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "depth": 20
}

Response:
{
    "move": "e2e4",
    "best_move": "e2e4",
    "depth_used": 20,
    "evaluation": 0.5
}
```

### Difficulty Levels
```
Easy   → depth 5
Medium → depth 15
Hard   → depth 50
Expert → depth 150
```

---

## 🐛 Troubleshooting

### ❌ Error: "Cannot connect to Python backend"

**Solution:**
1. Make sure `python app.py` is running in terminal
2. Check if port 5000 is available
3. Verify no firewall is blocking the connection
4. Try accessing http://127.0.0.1:5000/api/health in browser

### ❌ Error: "Stockfish engine not available"

**Solution:**
1. Verify `stockfish.exe` is in your backend folder
2. Test: Run `stockfish.exe --version` in terminal
3. Check file path in app.py initialization
4. Make sure Stockfish binary is executable

### ❌ Error: "ModuleNotFoundError: No module named 'stockfish'"

**Solution:**
```bash
# Activate virtual environment first
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Then install dependencies
pip install -r requirements.txt
```

### ⚠️ Game runs but AI doesn't respond

**Solution:**
1. Check browser console (F12) for errors
2. Check Flask terminal for error messages
3. Verify backend health: http://127.0.0.1:5000/api/health
4. Check network tab in browser DevTools

### 💡 CORS Error (Cross-Origin)

**Solution:** Already handled in Flask with `CORS(app)` in app.py. If issues persist:
1. Check Flask console for CORS warnings
2. Ensure `Flask-CORS` is installed
3. Verify frontend is on `http://` not `https://`

---

## 🚀 How It Works

### Frontend → Backend Flow

1. **Player makes move** on chess board
2. **JavaScript validates** move locally with Chess.js
3. **FEN position sent** to Python backend via REST API
4. **Stockfish engine** calculates best move on backend
5. **Move returned** as JSON to frontend
6. **JavaScript applies** move to board
7. **Board re-renders** with new position

### Key Changes from Original

| Aspect | Original | Updated |
|--------|----------|---------|
| **AI Logic** | JavaScript (Stockfish.js Web Worker) | Python (Stockfish binary) |
| **Move Calculation** | Client-side (browser) | Server-side (Python) |
| **API** | None (local) | REST API on port 5000 |
| **Dependencies** | Chess.js + Stockfish.js | Chess.js + Flask + Python Stockfish |
| **Frontend Code** | Removed Web Worker code | Added fetch API calls |
| **Backend Code** | None | New Flask application |

---

## 📊 Performance Notes

- **Easy (depth 5)**: ~50ms response time
- **Medium (depth 15)**: ~200-500ms response time
- **Hard (depth 50)**: ~1-3 seconds response time
- **Expert (depth 150)**: ~5-15 seconds response time

Adjust depths in `app.py` if needed:
```python
difficulty_map = {
    'easy': 5,        # Change this value
    'medium': 15,     # Change this value
    'hard': 50,       # Change this value
    'expert': 150     # Change this value
}
```

---

## 🔧 Advanced Configuration

### Change Backend Port

In `app.py`, modify:
```python
if __name__ == '__main__':
    app.run(
        host='127.0.0.1',
        port=5000,  # ← Change this
        debug=True,
        threaded=True
    )
```

In `script.js`, update:
```javascript
this.apiUrl = 'http://127.0.0.1:5000/api';  // ← Change port here
```

### Set Stockfish Path Manually

In `app.py`, add your custom path:
```python
stockfish = Stockfish(path="C:/custom/path/stockfish.exe")
```

### Production Deployment

For production:
```python
if __name__ == '__main__':
    app.run(
        host='0.0.0.0',        # Accept external connections
        port=5000,
        debug=False,           # Disable debug mode
        threaded=True
    )
```

---

## 📚 Resources

- **Stockfish Official**: https://stockfishchess.org/
- **Python Stockfish Lib**: https://github.com/zhelyabuzhsky/stockfish
- **Flask Documentation**: https://flask.palletsprojects.com/
- **Chess.js Library**: https://chessboardjs.com/
- **REST API Basics**: https://restfulapi.net/

---

## ✅ Verification Checklist

- [ ] Stockfish binary downloaded and placed in backend folder
- [ ] Virtual environment created and activated
- [ ] `pip install -r requirements.txt` completed
- [ ] Flask app runs without errors: `python app.py`
- [ ] Backend health check works: http://127.0.0.1:5000/api/health
- [ ] Frontend `script.js` updated with API calls
- [ ] Browser console shows no errors
- [ ] Game board displays correctly
- [ ] AI makes moves when it's their turn
- [ ] All difficulty levels work

---

## 🎮 Quick Start Command Summary

```bash
# Terminal 1: Start Backend
cd backend
venv\Scripts\activate  # Windows (or source venv/bin/activate for Mac/Linux)
python app.py

# Terminal 2 (or Browser): Open Frontend
# Open frontend/index.html in your browser
# OR: Use a simple HTTP server
cd frontend
python -m http.server 8000
# Then visit: http://127.0.0.1:8000
```

---

**Backend Status**: ✅ Ready to Deploy
**Last Updated**: November 2025
**Version**: 1.0