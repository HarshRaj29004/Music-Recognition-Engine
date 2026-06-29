import os
import uuid
from pydub import AudioSegment
import cloudinary.uploader
from db.db import db
from audio.AudioProcessing import AudioProcessing
from utils.utils import (
    READ_SIZE, CHUNK_SIZE, SAMPLE_RATE, SAMPLE_WIDTH, CHANNELS, BATCH, downloading_song
)

def check_preview_match(full_audio: bytearray):
    """Generates a temporary WAV from buffered audio to check for an early database match."""
    preview_file = f"temp_chunk_{uuid.uuid4()}.wav"
    try:
        AudioSegment(
            data=bytes(full_audio),
            sample_width=SAMPLE_WIDTH,
            frame_rate=SAMPLE_RATE,
            channels=CHANNELS
        ).export(preview_file, format="wav")

        processor = AudioProcessing(preview_file)
        processor.converting_to_frequency_domain()
        hashes = processor.hashing()

        hash_pairs = [
            {"input_hash": int(h), "sample_time": int(t)}
            for h, times in hashes.items()
            for t in times
        ]

        if hash_pairs:
            try:
                res = db.rpc("match_audio", {"input_hashes": hash_pairs}).execute()
                if res.data and res.data[0]["score"] >= 25:
                    print(f"MATCH FOUND ({res.data[0]['title']})! Stopping stream early.")
                    return {
                        "status": "Already Exists",
                        "song_id": res.data[0]["song_id"],
                        "title": res.data[0]["title"]
                    }
            except Exception as rpc_err:
                print("Supabase RPC preview check warning:", str(rpc_err))
        return None
    finally:
        if os.path.exists(preview_file):
            os.remove(preview_file)


def upload_audio_to_cloudinary(file_path: str) -> str:
    """Uploads the finalized WAV file to Cloudinary audio storage."""
    try:
        print("*UPLOADING TO CLOUDINARY*")
        c_res = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
            folder="shazam_songs"
        )
        cloud_url = c_res.get("secure_url")
        print(f"Uploaded to Cloudinary: {cloud_url}")
        return cloud_url
    except Exception as c_err:
        print("Cloudinary upload warning/error:", str(c_err))
        return None


def index_hashes_to_db(song_id: int, final_hashes: dict):
    """Batch inserts extracted audio hashes into the Supabase database."""
    hash_payload = [
        {
            "song_id": song_id,
            "hash": int(h),
            "time_offset": int(t)
        }
        for h, offsets in final_hashes.items()
        for t in offsets
    ]

    for i in range(0, len(hash_payload), BATCH):
        db.table("audio_hashes").insert(hash_payload[i:i + BATCH]).execute()


def process_and_index_track(url: str):
    """Main service workflow for streaming, checking, uploading, and indexing a YouTube track."""
    process = None
    buffer = bytearray()
    full_audio = bytearray()
    chunk_count = 0
    final_file = None

    try:
        process, title, channel, youtube_url = downloading_song(url)

        # 1. Chunk streaming & processing
        while True:
            data = process.stdout.read(READ_SIZE)
            if not data:
                print("*STREAM ENDED*")
                break

            buffer.extend(data)

            while len(buffer) >= CHUNK_SIZE:
                chunk = buffer[:CHUNK_SIZE]
                buffer = buffer[CHUNK_SIZE:]
                chunk_count += 1
                full_audio.extend(chunk)

                # Periodic preview match (every 10 chunks)
                if chunk_count % 10 == 0:
                    early_match = check_preview_match(full_audio)
                    if early_match:
                        process.kill()
                        process.wait(timeout=3)
                        return early_match

        # 2. Export full track for indexing
        print("*INDEXING FULL SONG*")
        final_file = f"temp_final_{uuid.uuid4()}.wav"
        AudioSegment(
            data=bytes(full_audio),
            sample_width=SAMPLE_WIDTH,
            frame_rate=SAMPLE_RATE,
            channels=CHANNELS
        ).export(final_file, format="wav")

        # 3. Extract spectral hashes
        processor = AudioProcessing(final_file)
        processor.converting_to_frequency_domain()
        final_hashes = processor.hashing()

        # 4. Upload to Cloudinary
        cloud_audio_url = upload_audio_to_cloudinary(final_file)

        # 5. Insert song metadata into DB
        song_res = db.table("songs").insert({
            "title": title,
            "channel": channel,
            "url": youtube_url,
            "audio_url": cloud_audio_url
        }).execute()

        if not song_res.data:
            raise Exception("Failed to insert song record into Supabase.")

        song_id = song_res.data[0]["id"]

        # 6. Insert audio hashes
        index_hashes_to_db(song_id, final_hashes)

        print(f"Indexed successfully: {title}")
        return {
            "status": "Success",
            "song_id": song_id,
            "title": title
        }

    except Exception as e:
        if process and process.poll() is None:
            process.kill()
        raise e

    finally:
        if final_file and os.path.exists(final_file):
            os.remove(final_file)
