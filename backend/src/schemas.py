"""
Pydantic schemas for API requests/responses
"""
from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    subject: str
    question: str
    messages: list[Message] = []


class Source(BaseModel):
    file: str
    text: str
    similarity: float = 0.0


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]


class SubjectInfo(BaseModel):
    id: str
    name: str


class HealthResponse(BaseModel):
    status: str
    subjects_loaded: list[str]
    versions: dict[str, str] = {}
    tts_available: bool = False
    video_available: bool = False


class TTSRequest(BaseModel):
    text: str
    subject: str


class VideoRequest(BaseModel):
    text: str
    subject: str
