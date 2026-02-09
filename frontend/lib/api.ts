import axios from 'axios';

// API URLs configuration
// Supports two modes:
// 1. Monolith: NEXT_PUBLIC_API_URL points to single backend (default for local dev)
// 2. Microservices: NEXT_PUBLIC_<SUBJECT>_API_URL points to subject-specific services

const DEFAULT_API_URL = 'http://localhost:8000';

// Subject-specific URLs (for microservices mode)
const SERVICE_URLS: Record<string, string> = {
  fsd: process.env.NEXT_PUBLIC_FSD_API_URL || '',
  fcs: process.env.NEXT_PUBLIC_FCS_API_URL || '',
  dma: process.env.NEXT_PUBLIC_DMA_API_URL || '',
};

// Fallback URL (for monolith mode)
const MONOLITH_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

// Get API URL for a subject
function getApiUrl(subject?: string): string {
  if (subject && SERVICE_URLS[subject]) {
    return SERVICE_URLS[subject];
  }
  return MONOLITH_URL;
}

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
    // In microservices mode, we define subjects statically
    // In monolith mode, we fetch from the API
    const microservicesMode = Object.values(SERVICE_URLS).some(url => url !== '');

    if (microservicesMode) {
      // Return hardcoded subjects for microservices mode
      return [
        { id: 'fsd', name: 'Fundamentals of Software Development' },
        { id: 'fcs', name: 'Fundamentals of Computer Science' },
        { id: 'dma', name: 'Discrete Mathematics' },
      ];
    }

    const response = await axios.get(`${MONOLITH_URL}/api/subjects`);
    return response.data;
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiUrl = getApiUrl(request.subject);
    const response = await axios.post(`${apiUrl}/api/chat`, request);
    return response.data;
  },
};
