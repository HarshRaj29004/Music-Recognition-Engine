import os
import requests
from fastapi import UploadFile
from pydub import AudioSegment, effects
from db.db import db
from audio.AudioProcessing import AudioProcessing
from utils.utils import temp_file_upload, get_temp_filepath, SAMPLE_RATE,CHANNELS, SEARCH_SERVER_URL

def preprocess_uploaded_clip(file: UploadFile):
    """Saves raw upload, standardizes sample rate & channels, and normalizes audio volume."""
    temp_file = temp_file_upload(file)
    audio_clip = AudioSegment.from_file(temp_file)
    audio_clip = audio_clip.set_frame_rate(SAMPLE_RATE).set_channels(CHANNELS)
    audio_clip = effects.normalize(audio_clip)
    audio_filename = os.path.basename(os.path.splitext(temp_file)[0])
    cropped_file = get_temp_filepath(f"{audio_filename}_processed.wav")
    audio_clip.export(cropped_file, format="wav")
    return temp_file, cropped_file


def extract_audio_hashes(processed_wav_path: str):
    """Processes audio frequency spectrogram and returns sorted hash pairs."""
    processor = AudioProcessing(processed_wav_path)
    processor.converting_to_frequency_domain()
    hashes = processor.hashing()
    sorted_hashes = sorted(
        hashes.items(),
        key=lambda item: len(item[1]),
        reverse=True
    )

    hash_pairs = []
    for h, times in sorted_hashes:
        for t in times:
            hash_pairs.append({"input_hash": int(h), "sample_time": int(t)})
            
    return hash_pairs


def query_database_matches(hash_pairs: list):
    """Queries C++ Search Server (with Supabase fallback) and returns top matches above threshold."""
    if not hash_pairs:
        return {"message": "No audio fingerprints found in recording.", "match_found": False}

    MIN_SCORE_THRESHOLD = 10
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
            if matches:
                filtered_matches = [m for m in matches if m["score"] >= MIN_SCORE_THRESHOLD]
                if filtered_matches:
                    song_ids = [m["song_id"] for m in filtered_matches]
                    meta_res = db.table("songs").select("*").in_("id", song_ids).execute()
                    song_metadata = {s["id"]: s for s in meta_res.data or []}
                    candidates = []
                    for match in filtered_matches:
                        meta = song_metadata.get(match["song_id"])
                        if meta:
                            candidates.append({
                                "song_id": match["song_id"],
                                "score": match["score"],
                                "title": meta["title"],
                                "channel": meta["channel"]
                            })
                    
                    if candidates:
                        print("Query matching via C++ Search Server succeeded.")
                        return {
                            "match_found": True,
                            "match_1": candidates[0] if len(candidates) > 0 else None,
                            "match_2": candidates[1] if len(candidates) > 1 else None,
                            "match_3": candidates[2] if len(candidates) > 2 else None,
                        }
                else:
                    print("C++ Search Server returned candidates, but all were below score threshold.")
                    return {"match_found": False, "message": "No matching songs found (low confidence)."}
    except Exception as e:
        print("C++ Search Server connection failure, falling back to Supabase RPC:", str(e))

    try:
        result = db.rpc("match_audio", {"input_hashes": hash_pairs}).execute()
        data = result.data or []
        if not data:
            return {"match_found": False, "message": "No matching songs found in library."}

        filtered_data = [item for item in data if item["score"] >= MIN_SCORE_THRESHOLD]
        if not filtered_data:
            print("Supabase RPC returned candidates, but all were below score threshold.")
            return {"match_found": False, "message": "No matching songs found (low confidence)."}

        match_1 = filtered_data[0] if len(filtered_data) > 0 else None
        match_2 = filtered_data[1] if len(filtered_data) > 1 else None
        match_3 = filtered_data[2] if len(filtered_data) > 2 else None
        print("Query matching via Supabase RPC fallback succeeded.")
        return {
            "match_found": True,
            "match_1": match_1,
            "match_2": match_2,
            "match_3": match_3,
        }
    except Exception as db_err:
        print("Supabase RPC match query failed:", str(db_err))
        return {"match_found": False, "message": "Database lookup failed."}


def identify_audio_sample(file: UploadFile):
    """Main service workflow for processing an uploaded audio sample and identifying the track."""
    temp_file = None
    cropped_file = None
    try:
        temp_file, cropped_file = preprocess_uploaded_clip(file)
        hash_pairs = extract_audio_hashes(cropped_file)
        result = query_database_matches(hash_pairs)
        return result
    finally:
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)
        if cropped_file and os.path.exists(cropped_file):
            os.remove(cropped_file)
