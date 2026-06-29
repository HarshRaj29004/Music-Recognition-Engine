import os
import shutil
import subprocess
import uuid
from pydub import AudioSegment
from fastapi import UploadFile
import yt_dlp

SAMPLE_RATE = 44100
SAMPLE_WIDTH = 2  
CHANNELS = 1
BYTES_PER_SEC = SAMPLE_RATE * SAMPLE_WIDTH * CHANNELS
CHUNK_DURATION_SEC = 5
CHUNK_SIZE = BYTES_PER_SEC * CHUNK_DURATION_SEC
READ_SIZE = 4096  
BATCH = 1000

def temp_file_upload(file: UploadFile) -> str:
    unique_id = uuid.uuid4()
    suffix = os.path.splitext(file.filename)[1] or ".tmp"
    
    raw_tmp_path = f"temp_raw_{unique_id}{suffix}"
    final_wav_path = f"temp_{unique_id}.wav"

    try:
        # DUMPED TO DISK
        with open(raw_tmp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # CONVERTER
        track = AudioSegment.from_file(raw_tmp_path)
        track.export(final_wav_path, format="wav")
        return final_wav_path

    finally:
        file.file.close()
        if os.path.exists(raw_tmp_path):
            os.remove(raw_tmp_path)




def downloading_song(url: str):
    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info["url"]
        title = info.get("title", "Unknown")
        channel = info.get("uploader", "Unknown")
        yt_url = info.get("webpage_url")

    ffmpeg_cmd = [
        "ffmpeg",
        "-loglevel", "error",
        "-reconnect", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "5",
        "-vn",
        "-i", stream_url,
        "-f", "s16le",
        "-acodec", "pcm_s16le",
        "-ar", str(SAMPLE_RATE),
        "-ac", str(CHANNELS),
        "-"
    ]

    process = subprocess.Popen(
        ffmpeg_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=10**6
    )

    return process, title, channel, yt_url

