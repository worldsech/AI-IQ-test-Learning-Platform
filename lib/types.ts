export interface UserProfile {
  uid: string
  email: string
  fullName: string
  profilePicture?: string
  iqScore?: number
  hasCompletedIQTest: boolean
  testFrequency: "weekly" | "monthly" | "quarterly" | "never"
  lastTestDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export interface UploadedDocument {
  id: string
  name: string
  content: string
  type: string
  uploadedAt: Date
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  documents?: UploadedDocument[]
  createdAt: Date
  updatedAt: Date
}

export interface IQTestQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  difficulty: "easy" | "medium" | "hard"
  category: "logical" | "mathematical" | "verbal" | "spatial"
}

export interface IQTestResult {
  id: string
  userId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  completedAt: Date
  timeSpent: number
}

export interface Document {
  id: string
  userId: string
  sessionId: string
  name: string
  content: string
  type: string
  uploadedAt: Date
}
