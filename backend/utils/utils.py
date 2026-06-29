import os
import shutil
import uuid
import tempfile
from pydub import AudioSegment
from fastapi import UploadFile, HTTPException
import yt_dlp

SAMPLE_RATE = 44100
SAMPLE_WIDTH = 2  
CHANNELS = 1
BYTES_PER_SEC = SAMPLE_RATE * SAMPLE_WIDTH * CHANNELS
CHUNK_DURATION_SEC = 5
CHUNK_SIZE = BYTES_PER_SEC * CHUNK_DURATION_SEC
READ_SIZE = 4096  
BATCH = 1000

def get_temp_filepath(filename_suffix: str) -> str:
    """Generates a cross-platform absolute path in the system temporary directory."""
    return os.path.join(tempfile.gettempdir(), filename_suffix)

def temp_file_upload(file: UploadFile) -> str:
    unique_id = uuid.uuid4()
    suffix = os.path.splitext(file.filename)[1] or ".tmp"
    
    raw_tmp_path = get_temp_filepath(f"temp_raw_{unique_id}{suffix}")
    final_wav_path = get_temp_filepath(f"temp_{unique_id}.wav")

    try:
        with open(raw_tmp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        track = AudioSegment.from_file(raw_tmp_path)
        track.export(final_wav_path, format="wav")
        return final_wav_path

    finally:
        file.file.close()
        if os.path.exists(raw_tmp_path):
            os.remove(raw_tmp_path)


def downloading_song(url: str):
    """Downloads YouTube audio reliably via yt_dlp into the system temp directory."""
    unique_id = uuid.uuid4()
    raw_template = get_temp_filepath(f"temp_yt_raw_{unique_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': raw_template,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'retries': 10,
        'fragment_retries': 10,
        'skip_unavailable_fragments': True,
        'buffersize': 1024 * 1024,
        'http_chunk_size': 1048576,
        'js_runtimes': {'node': {}},
        'extractor_args': {
            'youtube': {
                'player_client': ['tv', 'mweb', 'android', 'web']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "Unknown Track")
            channel = info.get("uploader", "Unknown Artist")
            yt_url = info.get("webpage_url", url)
            raw_file = ydl.prepare_filename(info)
    except Exception as e:
        print("yt_dlp download error:", str(e))
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to download audio from YouTube URL. Error: {str(e)}"
        )

    final_wav = get_temp_filepath(f"temp_yt_{unique_id}.wav")
    try:
        if not os.path.exists(raw_file) or os.path.getsize(raw_file) == 0:
            raise HTTPException(status_code=400, detail="Downloaded audio file is empty.")

        audio = AudioSegment.from_file(raw_file)
        audio = audio.set_frame_rate(SAMPLE_RATE).set_channels(CHANNELS)
        audio.export(final_wav, format="wav")
        return final_wav, title, channel, yt_url
    finally:
        if os.path.exists(raw_file):
            os.remove(raw_file)
