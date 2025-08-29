"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { doc, updateDoc, collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Brain, Clock, CheckCircle, XCircle } from "lucide-react"
import type { IQTestQuestion } from "@/lib/types"

export default function IQTestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [questions, setQuestions] = useState<IQTestQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
  const [loading, setLoading] = useState(false)
  const [testStarted, setTestStarted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    generateQuestions()
  }, [])

  useEffect(() => {
    if (testStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && testStarted) {
      handleSubmitTest()
    }
  }, [timeLeft, testStarted])

  const generateQuestions = async () => {
    try {
      console.log("Generating IQ questions...")
      const response = await fetch("/api/generate-iq-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions received from API")
      }

      console.log("Successfully loaded questions:", data.questions.length)
      setQuestions(data.questions)
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      })

      // Optionally redirect back or provide retry option
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = answerIndex
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      handleSubmitTest()
    }
  }

  const handleSubmitTest = async () => {
    setLoading(true)

    // Calculate score
    let correctAnswers = 0
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++
      }
    })

    const calculatedScore = Math.round((correctAnswers / questions.length) * 200) // Scale to 200 max
    setScore(calculatedScore)

    try {
      // Update user profile
      await updateDoc(doc(db, "users", user!.uid), {
        iqScore: calculatedScore,
        hasCompletedIQTest: true,
        lastTestDate: new Date(),
        updatedAt: new Date(),
      })

      // Save test result
      await addDoc(collection(db, "iqTestResults"), {
        userId: user!.uid,
        score: calculatedScore,
        totalQuestions: questions.length,
        correctAnswers,
        completedAt: new Date(),
        timeSpent: 1800 - timeLeft,
      })

      setShowResults(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save test results",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <CardTitle className="text-3xl font-bold">IQ Assessment Test</CardTitle>
            <CardDescription className="text-lg">
              This test will help us personalize your learning experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Test Instructions:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  30 minutes to complete 20 questions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Questions cover logical, mathematical, verbal, and spatial reasoning
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Choose the best answer for each question
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  You cannot go back to previous questions
                </li>
              </ul>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setTestStarted(true)} className="flex-1" size="lg">
                <Clock className="mr-2 h-4 w-4" />
                Start Test
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex-1" size="lg">
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Test Complete!</CardTitle>
            <CardDescription>Your IQ assessment results</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">{score}</div>
              <div className="text-sm opacity-90">IQ Score</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="font-semibold">Correct Answers</div>
                <div className="text-2xl font-bold text-green-600">
                  {answers.filter((answer, index) => answer === questions[index]?.correctAnswer).length}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="font-semibold">Time Used</div>
                <div className="text-2xl font-bold text-blue-600">{formatTime(1800 - timeLeft)}</div>
              </div>
            </div>
            <Button onClick={() => router.push("/dashboard")} className="w-full" size="lg">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p>Generating your personalized test questions...</p>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">IQ Assessment</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <Progress value={progress} className="mb-8" />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{currentQ.question}</CardTitle>
            <CardDescription>
              Category: {currentQ.category} • Difficulty: {currentQ.difficulty}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQ.options.map((option, index) => (
              <Button
                key={index}
                variant={answers[currentQuestion] === index ? "default" : "outline"}
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => handleAnswerSelect(index)}
              >
                <span className="font-semibold mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </Button>
            ))}

            <div className="flex justify-between pt-6">
              <div className="text-sm text-muted-foreground">
                {answers[currentQuestion] !== undefined ? "Answer selected" : "Select an answer to continue"}
              </div>
              <Button onClick={handleNext} disabled={answers[currentQuestion] === undefined || loading}>
                {currentQuestion === questions.length - 1 ? "Submit Test" : "Next Question"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
