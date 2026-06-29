from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from services.song_service import fetch_all_songs
from services.indexing_service import process_and_index_track
from services.identification_service import identify_audio_sample

router = APIRouter()

@router.get("/songs")
async def get_all_songs():
    """Retrieves all indexed songs from the database via song_service."""
    return fetch_all_songs()


@router.post("/audio_upload")
async def audio_upload(url: str = Body(..., embed=True)):
    """Downloads, verifies, uploads, and indexes a YouTube track via indexing_service."""
    try:
        return process_and_index_track(url)
    except Exception as e:
        print("ERROR in audio_upload route:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/identify")
async def identify_song(file: UploadFile = File(...)):
    """Preprocesses recorded audio and matches fingerprints via identification_service."""
    try:
        return identify_audio_sample(file)
    except Exception as e:
        print("SERVER ERROR in identify_song route:", str(e))
        raise HTTPException(status_code=500, detail="Internal Server Error")