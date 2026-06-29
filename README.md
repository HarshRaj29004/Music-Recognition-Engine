# Soundify - Music Recognition Engine & Cloud Player 🎵

A full-stack acoustic fingerprinting and streaming platform that identifies ambient songs and plays curated audio tracks. Inspired by the Shazam spectral analysis algorithm, Soundify creates unique acoustic constellation fingerprints and matches them in real-time against a database of stored tracks.

---

## 🎵 Key Features

- **🎙️ Acoustic Shazam Engine**: Record live ambient audio through your microphone to extract spectral constellation peaks and identify matching songs in real-time.
- **🎧 Cloud Audio Library**: Stream full-length audio tracks stored in high-fidelity cloud storage with custom playback, timeline seeking, and volume controls.
- **➕ YouTube Track Ingestion**: Enter any YouTube video URL to automatically process audio, extract acoustic fingerprints, and add the track to your streaming library.
- **⚡ Early Duplicate Checking**: Smart preview matching analyzes the first 30 seconds of ingested tracks to prevent duplicate database entries and save processing time.
- **✨ Modular Service Architecture**: Cleanly decoupled FastAPI backend services paired with a modern glassmorphism React + Tailwind frontend.

---

## 🏗️ Project Structure

```text
shazam/
├── backend/                          # FastAPI Backend Application
│   ├── main.py                      # Application entrypoint & CORS middleware
│   ├── audio/
│   │   ├── AudioProcessing.py       # Core spectral analysis & peak hashing
│   │   └── testing.py               # Algorithm verification tests
│   ├── services/                    # Modular Business Service Layer
│   │   ├── song_service.py          # Track library retrieval
│   │   ├── indexing_service.py      # YouTube audio processing & DB indexing
│   │   └── identification_service.py # Microphone clip preprocessing & matching
│   ├── route/
│   │   └── route.py                 # Lightweight API routing delegators
│   ├── db/
│   │   └── db.py                    # Supabase & Cloudinary client setup
│   ├── utils/
│   │   └── utils.py                 # File handling & yt-dlp audio extraction
│   └── model/
│       └── audio.py                 # Data models
├── frontend/                        # React + Vite Frontend Application
│   ├── src/
│   │   ├── App.jsx                  # Root layout & toast notifications
│   │   ├── pages/
│   │   │   └── audioRecord.jsx      # Music library, Shazam recorder & uploader
│   │   └── assets/                  # Styling & static assets
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite bundler configuration
└── docker-compose.yml               # Container deployment setup
```

---

## 🔧 Tech Stack

### Backend
* **FastAPI**: Asynchronous Python web API framework.
* **SciPy & NumPy**: Fast Fourier Transform (FFT), spectrogram generation, and 2D maximum filtering.
* **Pydub & FFmpeg**: Audio format conversion, channel standardization, and volume normalization.
* **yt-dlp**: YouTube audio extraction and download management.
* **Supabase (PostgreSQL)**: Cloud database storing song metadata and bit-packed fingerprint hashes.
* **Cloudinary**: Cloud media storage hosting streamable track audio files.

### Frontend
* **React 19 & Vite**: Ultra-fast single page interface.
* **Tailwind CSS**: Sleek modern dark-mode styling with glassmorphism effects.
* **HTML5 Audio API**: Integrated persistent bottom audio player.
* **React Hot Toast**: Real-time interactive user feedback notifications.

---

## 🚀 Getting Started

### Prerequisites
* **Python 3.8+**
* **Node.js 18+**
* **FFmpeg** (Installed and added to System PATH)

---

### 1. Backend Setup

```bash
cd backend
# Activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt
pip install -U yt-dlp        # Ensure latest yt-dlp build
```

Create a `.env` file inside the `backend/` directory:
```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
Frontend_url=http://localhost:5173
```

Start the backend server:
```bash
python main.py
```
The FastAPI server will start at `http://localhost:8000`.

---

### 2. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The React application will run at `http://localhost:5173`.

---

## 📡 API Reference

| Endpoint | Method | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Server health check | None |
| `/songs` | `GET` | Retrieves all curated library tracks | None |
| `/audio_upload` | `POST` | Processes & indexes a YouTube track | `{"url": "https://youtube.com/..."}` |
| `/identify` | `POST` | Matches recorded audio sample against fingerprints | `multipart/form-data` (`file`) |

---

## 🧠 How the Acoustic Fingerprinting Works

1. **Spectrogram Generation**: Converts raw 44.1kHz mono audio samples into a time-frequency log spectrogram using Short-Time Fourier Transform (STFT).
2. **Constellation Mapping**: Extracts local spectral peak maxima using a 2D uniform filter (`scipy.ndimage.maximum_filter`) filtered by dynamic volume thresholding.
3. **Combinatorial Hashing**: Links pairs of peak frequencies (`f1`, `f2`) and time differences (`dt`) into 32-bit uint integers.
4. **RPC Match Scoring**: Queries Supabase PostgreSQL RPC (`match_audio`) to calculate offset consistency scores across stored candidate tracks.

---

## 📄 License

This project is open source and available under the MIT License.
