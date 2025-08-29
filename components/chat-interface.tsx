"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Brain, Paperclip, FileText, X, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import type { ChatSession, UserProfile, ChatMessage } from "@/lib/types"
import { doc, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"

interface ChatInterfaceProps {
  currentSession: ChatSession | null
  onSessionUpdate: (session: ChatSession) => void
  userProfile: UserProfile
  onIQTestRequired: () => void
}

interface UploadedDocument {
  id: string
  name: string
  content: string
  type: string
  uploadedAt: Date
}

// Helper function to get IQ level description
function getIQLevel(iqScore: number) {
  if (iqScore < 90) {
    return {
      level: "LOW",
      description: "Below Average",
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    }
  } else if (iqScore >= 90 && iqScore <= 119) {
    return {
      level: "MEDIUM",
      description: "Average to High Average",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    }
  } else {
    return {
      level: "HIGH",
      description: "Superior to Gifted",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    }
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp: any): string {
  try {
    if (!timestamp) return ""

    // Handle Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleTimeString()
    }

    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString()
    }

    // Handle string or number timestamp
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString()
    }

    return ""
  } catch (error) {
    console.error("Error formatting timestamp:", error)
    return ""
  }
}

// Helper function to get file icon based on type
function getFileIcon(fileName: string, fileType: string) {
  const extension = fileName.toLowerCase().split(".").pop()

  if (extension === "pdf" || fileType.includes("pdf")) {
    return <File className="h-3 w-3 text-red-600" />
  } else if (extension === "docx" || fileType.includes("wordprocessingml")) {
    return <File className="h-3 w-3 text-blue-600" />
  } else {
    return <FileText className="h-3 w-3 text-gray-600" />
  }
}

export function ChatInterface({ currentSession, onSessionUpdate, userProfile, onIQTestRequired }: ChatInterfaceProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentSession?.messages])

  // Load documents for current session
  useEffect(() => {
    if (currentSession) {
      loadSessionDocuments()
    }
  }, [currentSession])

  const loadSessionDocuments = async () => {
    if (!currentSession || !user) return

    try {
      // In a real app, you'd query documents for this session
      // For now, we'll store them in the session data
      const docs = currentSession.documents || []
      setUploadedDocuments(docs)
    } catch (error) {
      console.error("Error loading documents:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentSession || !user) return

    // Check file type
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    const allowedExtensions = [".txt", ".pdf", ".docx"]

    const isValidType =
      allowedTypes.includes(file.type) || allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!isValidType) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a .txt, .pdf, or .docx file",
        variant: "destructive",
      })
      return
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      // Send file to API for processing
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract-document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process document")
      }

      const { content, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (!content || !content.trim()) {
        toast({
          title: "Empty Document",
          description: "The document appears to be empty or unreadable",
          variant: "destructive",
        })
        return
      }

      // Limit content length to prevent API issues
      const maxLength = 15000 // 15k characters
      const truncatedContent =
        content.length > maxLength
          ? content.substring(0, maxLength) + "\n\n[Content truncated due to length...]"
          : content

      const newDocument: UploadedDocument = {
        id: Date.now().toString(),
        name: file.name,
        content: truncatedContent,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date(),
      }

      // Save document to session
      const updatedDocuments = [...uploadedDocuments, newDocument]
      setUploadedDocuments(updatedDocuments)

      // Update session in Firestore
      await updateDoc(doc(db, "chatSessions", currentSession.id), {
        documents: updatedDocuments,
        updatedAt: new Date(),
      })

      // Also save to a separate documents collection for better querying
      await addDoc(collection(db, "chatSessions", currentSession.id, "documents"), {
        ...newDocument,
        userId: user.uid,
        sessionId: currentSession.id,
      })

      toast({
        title: "Document Uploaded",
        description: `${file.name} has been processed and is ready for discussion`,
      })

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeDocument = async (documentId: string) => {
    if (!currentSession) return

    try {
      const updatedDocuments = uploadedDocuments.filter((doc) => doc.id !== documentId)
      setUploadedDocuments(updatedDocuments)

      // Update session in Firestore
      await updateDoc(doc(db, "chatSessions", currentSession.id), {
        documents: updatedDocuments,
        updatedAt: new Date(),
      })

      // Delete from sub-collection
      try {
        await deleteDoc(doc(db, "chatSessions", currentSession.id, "documents", documentId))
      } catch (error) {
        // Document might not exist in sub-collection, that's okay
        console.log("Document not found in sub-collection, continuing...")
      }

      toast({
        title: "Document Removed",
        description: "Document has been removed from this chat",
      })
    } catch (error) {
      console.error("Error removing document:", error)
      toast({
        title: "Error",
        description: "Failed to remove document",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentSession || !user) return

    // Check if user has completed IQ test
    if (!userProfile.hasCompletedIQTest) {
      onIQTestRequired()
      return
    }

    setLoading(true)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      role: "user",
      timestamp: new Date(),
    }

    try {
      // Add user message to session
      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updatedAt: new Date(),
      }
      onSessionUpdate(updatedSession)

      // Update session title if it's the first message
      const sessionTitle =
        currentSession.messages.length === 0
          ? message.trim().slice(0, 50) + (message.trim().length > 50 ? "..." : "")
          : currentSession.title

      // Clear input
      setMessage("")

      // Prepare context with uploaded documents
      const documentContext =
        uploadedDocuments.length > 0
          ? `\n\nREFERENCE DOCUMENTS:\n${uploadedDocuments
              .map((doc) => `Document: "${doc.name}"\nContent:\n${doc.content}\n---`)
              .join("\n\n")}`
          : ""

      // Send to AI API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim() + documentContext,
          iqScore: userProfile.iqScore,
          chatHistory: currentSession.messages,
          hasDocuments: uploadedDocuments.length > 0,
        }),
      })

      const data = await response.json()

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      }

      const finalSession = {
        ...updatedSession,
        title: sessionTitle,
        messages: [...updatedSession.messages, aiMessage],
        updatedAt: new Date(),
      }

      // Update Firestore
      await updateDoc(doc(db, "chatSessions", currentSession.id), {
        title: sessionTitle,
        messages: finalSession.messages,
        updatedAt: new Date(),
      })

      onSessionUpdate(finalSession)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!currentSession) {
    const iqLevel = userProfile.iqScore ? getIQLevel(userProfile.iqScore) : null

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to AI Learning</h2>
          <p className="text-muted-foreground mb-4">
            Start a new conversation to get personalized learning assistance based on your cognitive profile.
          </p>

          {userProfile.hasCompletedIQTest && iqLevel ? (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">Your Learning Profile</span>
              </div>
              <Badge className={iqLevel.color}>
                IQ {userProfile.iqScore} - {iqLevel.description}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                AI responses are tailored to your cognitive level for optimal learning
              </p>
            </div>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              Complete your IQ test to unlock AI-powered personalized learning
            </div>
          )}
        </div>
      </div>
    )
  }

  const iqLevel = userProfile.iqScore ? getIQLevel(userProfile.iqScore) : null

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header with IQ Level */}
      {userProfile.hasCompletedIQTest && iqLevel && (
        <div className="border-b p-3 bg-muted/30">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-4 w-4" />
            <Badge className={iqLevel.color} variant="secondary">
              Learning Level: {iqLevel.description}
            </Badge>
          </div>
        </div>
      )}

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div className="border-b p-3 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Uploaded Documents ({uploadedDocuments.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs border"
              >
                {getFileIcon(doc.name, doc.type)}
                <span className="truncate max-w-[120px]" title={doc.name}>
                  {doc.name}
                </span>
                <span className="text-muted-foreground">({Math.round(doc.content.length / 1000)}k chars)</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-red-100"
                  onClick={() => removeDocument(doc.id)}
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These documents are available as context for AI responses
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentSession.messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-600 text-white">AI</AvatarFallback>
              </Avatar>
            )}
            <Card className={`max-w-[70%] p-3 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-muted"}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-100" : "text-muted-foreground"}`}>
                {formatTimestamp(msg.timestamp)}
              </p>
            </Card>
            {msg.role === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile.profilePicture || `/placeholder.svg?height=32&width=32`} />
                <AvatarFallback>
                  {userProfile.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white">AI</AvatarFallback>
            </Avatar>
            <Card className="bg-muted p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                userProfile.hasCompletedIQTest
                  ? uploadedDocuments.length > 0
                    ? "Ask me anything about your uploaded documents..."
                    : "Ask me anything about learning..."
                  : "Complete your IQ test to start chatting..."
              }
              disabled={loading || !userProfile.hasCompletedIQTest}
              className="min-h-[60px] resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !userProfile.hasCompletedIQTest || uploading}
              className="h-[30px] w-[30px]"
              title="Upload document (.txt, .pdf, .docx)"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || loading || !userProfile.hasCompletedIQTest}
              size="icon"
              className="h-[30px] w-[30px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileUpload}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Upload documents (.txt, .pdf, .docx) to discuss with AI • Max 10MB
        </p>
      </div>
    </div>
  )
}
