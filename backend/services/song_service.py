from db.db import db

def fetch_all_songs():
    try:
        res = db.table("songs").select("*").order("id", desc=True).execute()
        return {"songs": res.data or []}
    except Exception as e:
        print("WARNING/ERROR fetching songs from Supabase:", str(e))
        return {"songs": [], "warning": "Database table 'songs' not found or empty."}
