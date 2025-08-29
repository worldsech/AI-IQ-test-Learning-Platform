"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Brain, Settings, User, LogOut, TestTube, Menu } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface DashboardHeaderProps {
  userProfile: UserProfile
  onIQTestClick: () => void
  onMenuClick?: () => void
}

export function DashboardHeader({ userProfile, onIQTestClick, onMenuClick }: DashboardHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut(auth)
      router.push("/auth/login")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="font-semibold">AI Learning Platform</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onIQTestClick} className="hidden sm:flex bg-transparent">
            <TestTube className="h-4 w-4 mr-2" />
            IQ Test
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.profilePicture || `/placeholder.svg?height=32&width=32`} />
                  <AvatarFallback>
                    {userProfile.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userProfile.fullName}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{userProfile.email}</p>
                  {userProfile.iqScore && <p className="text-xs text-blue-600">IQ Score: {userProfile.iqScore}</p>}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onIQTestClick} className="sm:hidden">
                <TestTube className="mr-2 h-4 w-4" />
                IQ Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
