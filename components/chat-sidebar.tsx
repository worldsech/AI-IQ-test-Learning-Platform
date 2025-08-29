"use client"

import { useState } from "react"
import { Plus, MessageSquare, Brain, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatSession, UserProfile } from "@/lib/types"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  onSessionSelect: (session: ChatSession | null) => void
  userProfile: UserProfile
  onClose?: () => void
}

export function ChatSidebar({ sessions, currentSession, onSessionSelect, userProfile, onClose }: ChatSidebarProps) {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)

  const createNewChat = async () => {
    if (!user) return

    setCreating(true)
    try {
      const newSession = {
        userId: user.uid,
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const docRef = await addDoc(collection(db, "chatSessions"), newSession)
      const sessionWithId = { id: docRef.id, ...newSession }
      onSessionSelect(sessionWithId)
    } catch (error) {
      console.error("Error creating new chat:", error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="font-semibold">AI Learning</h2>
              <p className="text-xs text-muted-foreground">IQ Score: {userProfile.iqScore || "Not tested"}</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={createNewChat} disabled={creating} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat Sessions */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 py-2">
          {sessions.map((session) => (
            <Button
              key={session.id}
              variant={currentSession?.id === session.id ? "secondary" : "ghost"}
              onClick={() => onSessionSelect(session)}
              className="w-full justify-start h-auto p-3 text-left"
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{session.title}</span>
            </Button>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.profilePicture || `/placeholder.svg?height=32&width=32`} />
            <AvatarFallback>
              {userProfile.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userProfile.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
