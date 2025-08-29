"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { DashboardHeader } from "@/components/dashboard-header"
import type { UserProfile, ChatSession } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadUserProfile()
      loadChatSessions()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const loadChatSessions = () => {
    if (!user) return

    const q = query(collection(db, "chatSessions"), where("userId", "==", user.uid), orderBy("updatedAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatSession[]
      setChatSessions(sessions)
    })

    return unsubscribe
  }

  const handleIQTestRequired = () => {
    toast({
      title: "IQ Test Required",
      description: "Please complete the IQ test to use AI assistance",
      variant: "destructive",
    })
    router.push("/iq-test")
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Failed to load user profile</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-80 bg-background border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <ChatSidebar
          sessions={chatSessions}
          currentSession={currentSession}
          onSessionSelect={setCurrentSession}
          userProfile={userProfile}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader
          userProfile={userProfile}
          onIQTestClick={() => router.push("/iq-test")}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            currentSession={currentSession}
            onSessionUpdate={setCurrentSession}
            userProfile={userProfile}
            onIQTestRequired={handleIQTestRequired}
          />
        </div>
      </div>
    </div>
  )
}
