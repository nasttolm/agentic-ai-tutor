import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export interface ChatRequest {
  subject: string;
  question: string;
  messages: Message[];
}

export interface Source {
  file: string;
  text: string;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface Subject {
  id: string;
  name: string;
}

export const api = {
  async getSubjects(): Promise<Subject[]> {
    const response = await axios.get(`${API_URL}/api/subjects`);
    return response.data;
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(`${API_URL}/api/chat`, request);
    return response.data;
  },
};
