"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Bell, TestTube, Moon, Sun } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    testFrequency: "monthly" as "weekly" | "monthly" | "quarterly" | "never",
    notifications: true,
    darkMode: false,
  })

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  useEffect(() => {
    setSettings((prev) => ({ ...prev, darkMode: theme === "dark" }))
  }, [theme])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile
        setUserProfile(profile)
        setSettings({
          testFrequency: profile.testFrequency || "monthly",
          notifications: true,
          darkMode: theme === "dark",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !userProfile) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "users", user.uid), {
        testFrequency: settings.testFrequency,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Settings updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
    setSettings((prev) => ({ ...prev, darkMode: checked }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* IQ Test Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                IQ Test Settings
              </CardTitle>
              <CardDescription>Configure how often you want to retake the IQ assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testFrequency">Test Frequency</Label>
                <Select
                  value={settings.testFrequency}
                  onValueChange={(value: "weekly" | "monthly" | "quarterly" | "never") =>
                    setSettings({ ...settings, testFrequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Regular testing helps improve AI personalization</p>
              </div>

              {userProfile?.lastTestDate && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Last test:</strong> {new Date(userProfile.lastTestDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <strong>Current IQ Score:</strong> {userProfile.iqScore}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch id="darkMode" checked={settings.darkMode} onCheckedChange={handleThemeChange} />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive reminders for IQ tests and learning sessions</p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Quick actions for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => router.push("/iq-test")} className="w-full">
                <TestTube className="mr-2 h-4 w-4" />
                Take IQ Test Now
              </Button>
              <Button variant="outline" onClick={() => router.push("/profile")} className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
