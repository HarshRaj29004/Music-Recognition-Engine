import os
import uuid
import requests
import threading
from pydub import AudioSegment
from fastapi import HTTPException
import cloudinary.uploader
from db.db import db
from audio.AudioProcessing import AudioProcessing
from utils.utils import BATCH, downloading_song, get_temp_filepath,SEARCH_SERVER_URL

def check_preview_match(wav_file_path: str):
    """Checks the first 30 seconds of downloaded audio against existing DB fingerprints."""
    preview_file = get_temp_filepath(f"temp_preview_{uuid.uuid4()}.wav")
    try:
        audio = AudioSegment.from_file(wav_file_path)
        # Take first 30 seconds (30,000 ms)
        preview_clip = audio[:30000]
        preview_clip.export(preview_file, format="wav")
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
                payload = {
                    "hashes": [
                        {"hash": int(item["input_hash"]), "offset": int(item["sample_time"])}
                        for item in hash_pairs
                    ]
                }
                res = requests.post(f"{SEARCH_SERVER_URL}/identify", json=payload, timeout=5)
                if res.status_code == 200:
                    matches = res.json()
                    if matches and matches[0]["score"] >= 25:
                        song_id = matches[0]["song_id"]
                        meta = db.table("songs").select("title").eq("id", song_id).execute()
                        title = meta.data[0]["title"] if meta.data else "Unknown"
                        print(f"MATCH FOUND ({title}) in C++ Server! Skipping full re-indexing.")
                        return {
                            "status": "Already Exists",
                            "song_id": song_id,
                            "title": title
                        }
            except Exception as cpp_err:
                print("C++ Search Server preview check warning, falling back to Supabase:", str(cpp_err))
                
            # 2. Fallback to Supabase RPC
            try:
                res = db.rpc("match_audio", {"input_hashes": hash_pairs}).execute()
                if res.data and res.data[0]["score"] >= 25:
                    print(f"MATCH FOUND ({res.data[0]['title']}) in Supabase RPC! Skipping full re-indexing.")
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
    """Main service workflow for downloading, preview matching, uploading, and indexing a YouTube track."""
    final_file = None
    try:
        # 1. Download & convert audio to WAV in system temp dir
        final_file, title, channel, youtube_url = downloading_song(url)

        if not os.path.exists(final_file) or os.path.getsize(final_file) == 0:
            raise HTTPException(status_code=400, detail="Downloaded audio file is empty or corrupted.")

        # 2. Early preview match check
        early_match = check_preview_match(final_file)
        if early_match:
            return early_match

        # 3. Extract spectral hashes from full song
        print("*INDEXING FULL SONG*")
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
        
        # 7. Push hashes to C++ Search Server
        push_hashes_to_cpp_server(song_id, final_hashes)
        
        print(f"Indexed successfully: {title}")
        return {
            "status": "Success",
            "song_id": song_id,
            "title": title
        }

    finally:
        if final_file and os.path.exists(final_file):
            os.remove(final_file)


def push_hashes_to_cpp_server(song_id: int, final_hashes: dict):
    """Pushes newly generated fingerprints to the C++ search server for real-time identification."""
    SEARCH_SERVER_URL = os.getenv("SEARCH_SERVER_URL", "http://localhost:8080")
    payload = {
        "song_id": song_id,
        "hashes": [
            {"hash": int(h), "offset": int(t)}
            for h, offsets in final_hashes.items()
            for t in offsets
        ]
    }
    try:
        res = requests.post(f"{SEARCH_SERVER_URL}/add", json=payload, timeout=10)
        if res.status_code == 200:
            print(f"[SYNC] Successfully uploaded hashes to C++ search server for song_id: {song_id}")
        else:
            print(f"[SYNC WARNING] C++ search server returned status {res.status_code}")
    except Exception as e:
        print(f"[SYNC ERROR] Failed to send hashes to C++ search server: {str(e)}")


def warmup_search_server_async():
    """Triggers background thread to sync existing hashes from Supabase to C++ search server."""
    thread = threading.Thread(target=sync_database_to_cpp_server)
    thread.daemon = True
    thread.start()


def sync_database_to_cpp_server():
    """Warms up the C++ search server index by paginating through all fingerprints in Supabase."""
    SEARCH_SERVER_URL = os.getenv("SEARCH_SERVER_URL", "http://localhost:8080")
    try:
        # Clear C++ server index
        requests.post(f"{SEARCH_SERVER_URL}/clear", timeout=5)
        print("[SYNC] Cleared C++ search server index.")
        
        # Paginate through audio_hashes
        limit = 1000
        offset = 0
        total_loaded = 0
        
        while True:
            res = db.table("audio_hashes").select("song_id, hash, time_offset").range(offset, offset + limit - 1).execute()
            batch = res.data or []
            if not batch:
                break
            
            # Group batch by song_id
            grouped = {}
            for item in batch:
                sid = item["song_id"]
                if sid not in grouped:
                    grouped[sid] = []
                grouped[sid].append({"hash": item["hash"], "offset": item["time_offset"]})
            
            # Send each group to C++ server
            for song_id, hashes in grouped.items():
                payload = {
                    "song_id": song_id,
                    "hashes": hashes
                }
                requests.post(f"{SEARCH_SERVER_URL}/add", json=payload, timeout=10)
                
            total_loaded += len(batch)
            print(f"[SYNC] Warm-up loaded {total_loaded} hashes into search server...")
            
            if len(batch) < limit:
                break
            offset += limit
            
        print("[SYNC] C++ Search Server warm-up synchronization complete.")
    except Exception as e:
        print("[SYNC ERROR] Failed to warm up C++ search server:", str(e))
