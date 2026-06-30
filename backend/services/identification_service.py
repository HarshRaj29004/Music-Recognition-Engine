import os
from fastapi import UploadFile
from pydub import AudioSegment, effects
from db.db import db
from audio.AudioProcessing import AudioProcessing
from utils.utils import temp_file_upload, get_temp_filepath, SAMPLE_RATE,CHANNELS

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
    """Queries Supabase RPC for matching audio tracks and safely builds candidate responses."""
    if not hash_pairs:
        return {"message": "No audio fingerprints found in recording.", "match_found": False}

    result = db.rpc("match_audio", {"input_hashes": hash_pairs}).execute()
    data = result.data or []
    if not data:
        return {"match_found": False, "message": "No matching songs found in library."}

    match_1 = data[0] if len(data) > 0 else None
    match_2 = data[1] if len(data) > 1 else None
    match_3 = data[2] if len(data) > 2 else None
    print("query_mathing")
    return {
        "match_found": True,
        "match_1": match_1,
        "match_2": match_2,
        "match_3": match_3,
    }


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
