import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes.route import router
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Soundify API Engine")
raw_frontend_url = os.getenv("FRONTEND_URL") or "*"
origins = [url.strip() for url in raw_frontend_url.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Soundify Audio Recognition Server is Running"}

app.include_router(router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)