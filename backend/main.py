from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from route.route import router
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

FRONTEND_URL = os.getenv("Frontend_url")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Audio Fingerprinting Server is Running"}

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)