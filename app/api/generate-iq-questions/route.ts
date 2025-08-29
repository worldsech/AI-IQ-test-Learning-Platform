import { type NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const prompt = `Generate exactly 20 IQ test questions in valid JSON format. Each question should follow this exact structure:

    [
      {
        "question": "What comes next in the sequence: 2, 4, 8, 16, ?",
        "options": ["24", "32", "30", "28"],
        "correctAnswer": 1,
        "difficulty": "medium",
        "category": "mathematical"
      }
    ]

    Requirements:
    - Mix of categories: logical, mathematical, verbal, spatial
    - Mix of difficulties: easy, medium, hard
    - correctAnswer should be the index (0-3) of the correct option
    - Return ONLY the JSON array, no additional text or explanations
    - Ensure all 20 questions are unique and test different cognitive abilities
    - Do not include image-based questions or references to images
    - Make sure all questions can be answered with text only`

    console.log("Making request to Gemini API...")

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      },
    )

    if (!response.ok) {
      console.error("Gemini API response not ok:", response.status, response.statusText)
      const errorText = await response.text()
      console.error("Error response:", errorText)

      // Return fallback questions immediately if API fails
      return NextResponse.json({ questions: getFallbackQuestions() })
    }

    const data = await response.json()
    console.log("Gemini API response received")

    // Check if response has the expected structure
    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      console.error("Unexpected API response structure:", data)
      return NextResponse.json({ questions: getFallbackQuestions() })
    }

    const generatedText = data.candidates[0].content.parts[0].text
    console.log("Generated text:", generatedText)

    try {
      // More robust cleaning of the response text
      let cleanedText = generatedText

      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

      // Find the JSON array - look for the opening bracket
      const jsonStart = cleanedText.indexOf("[")
      const jsonEnd = cleanedText.lastIndexOf("]")

      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        throw new Error("Could not find valid JSON array in response")
      }

      // Extract just the JSON array part
      const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1)
      console.log("Extracted JSON string:", jsonString)

      const questions = JSON.parse(jsonString)

      // Validate the questions array
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format")
      }

      // Add IDs and validate each question
      const questionsWithIds = questions
        .filter((q: any) => {
          // Filter out questions with image references
          return (
            q.question &&
            q.options &&
            Array.isArray(q.options) &&
            q.correctAnswer !== undefined &&
            !q.question.toLowerCase().includes("image") &&
            !q.question.toLowerCase().includes("[image") &&
            !q.options.some((opt: string) => opt.toLowerCase().includes("image"))
          )
        })
        .map((q: any, index: number) => ({
          ...q,
          id: `q_${index + 1}`,
        }))
        .slice(0, 20) // Ensure we have exactly 20 questions

      // If we don't have enough valid questions, supplement with fallback
      if (questionsWithIds.length < 20) {
        const fallbackQuestions = getFallbackQuestions()
        const needed = 20 - questionsWithIds.length
        questionsWithIds.push(...fallbackQuestions.slice(0, needed))
      }

      console.log("Successfully generated questions:", questionsWithIds.length)
      return NextResponse.json({ questions: questionsWithIds })
    } catch (parseError) {
      console.error("Error parsing generated questions:", parseError)
      console.error("Raw generated text:", generatedText)

      // Return fallback questions if parsing fails
      return NextResponse.json({ questions: getFallbackQuestions() })
    }
  } catch (error) {
    console.error("Error in generate-iq-questions API:", error)
    return NextResponse.json({ questions: getFallbackQuestions() })
  }
}

function getFallbackQuestions() {
  return [
    {
      id: "q_1",
      question: "What comes next in the sequence: 2, 4, 8, 16, ?",
      options: ["24", "32", "30", "28"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "mathematical",
    },
    {
      id: "q_2",
      question: "Which word does not belong: Apple, Orange, Car, Banana",
      options: ["Apple", "Orange", "Car", "Banana"],
      correctAnswer: 2,
      difficulty: "easy",
      category: "verbal",
    },
    {
      id: "q_3",
      question: "If all roses are flowers and some flowers are red, which statement is definitely true?",
      options: ["All roses are red", "Some roses are red", "Some roses might be red", "No roses are red"],
      correctAnswer: 2,
      difficulty: "medium",
      category: "logical",
    },
    {
      id: "q_4",
      question: "Complete the pattern: Triangle, Circle, Square, Triangle, Circle, ?",
      options: ["Triangle", "Circle", "Square", "Diamond"],
      correctAnswer: 2,
      difficulty: "easy",
      category: "spatial",
    },
    {
      id: "q_5",
      question: "What is 15% of 200?",
      options: ["25", "30", "35", "40"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "mathematical",
    },
    {
      id: "q_6",
      question: "Which number should replace the question mark: 3, 6, 12, 24, ?",
      options: ["36", "48", "42", "54"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "mathematical",
    },
    {
      id: "q_7",
      question: "Book is to Reading as Fork is to:",
      options: ["Eating", "Kitchen", "Spoon", "Food"],
      correctAnswer: 0,
      difficulty: "easy",
      category: "verbal",
    },
    {
      id: "q_8",
      question: "If you rearrange the letters 'CIFAIPC', you get the name of a:",
      options: ["Country", "Animal", "Ocean", "City"],
      correctAnswer: 2,
      difficulty: "hard",
      category: "verbal",
    },
    {
      id: "q_9",
      question: "Which comes next in the logical sequence: Monday, Wednesday, Friday, ?",
      options: ["Saturday", "Sunday", "Tuesday", "Thursday"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "logical",
    },
    {
      id: "q_10",
      question: "What is the next number: 1, 1, 2, 3, 5, 8, ?",
      options: ["11", "13", "15", "17"],
      correctAnswer: 1,
      difficulty: "hard",
      category: "mathematical",
    },
    {
      id: "q_11",
      question: "All birds can fly. Penguins are birds. Therefore:",
      options: [
        "Penguins can fly",
        "The statement is contradictory",
        "Penguins are not birds",
        "Some birds cannot fly",
      ],
      correctAnswer: 1,
      difficulty: "medium",
      category: "logical",
    },
    {
      id: "q_12",
      question: "Which word means the opposite of 'abundant'?",
      options: ["Plentiful", "Scarce", "Multiple", "Various"],
      correctAnswer: 1,
      difficulty: "easy",
      category: "verbal",
    },
    {
      id: "q_13",
      question: "If 5 machines make 5 widgets in 5 minutes, how long does it take 100 machines to make 100 widgets?",
      options: ["5 minutes", "20 minutes", "100 minutes", "500 minutes"],
      correctAnswer: 0,
      difficulty: "hard",
      category: "logical",
    },
    {
      id: "q_14",
      question: "What comes next: A1, B2, C3, D4, ?",
      options: ["E5", "F6", "E4", "D5"],
      correctAnswer: 0,
      difficulty: "easy",
      category: "spatial",
    },
    {
      id: "q_15",
      question: "Which number is missing: 2, 6, 12, 20, 30, ?",
      options: ["40", "42", "45", "48"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "mathematical",
    },
    {
      id: "q_16",
      question: "Water is to Ice as Milk is to:",
      options: ["Cream", "Cheese", "Liquid", "White"],
      correctAnswer: 1,
      difficulty: "medium",
      category: "verbal",
    },
    {
      id: "q_17",
      question: "If some cats are dogs and all dogs are animals, then:",
      options: ["Some cats are animals", "All cats are dogs", "No cats are animals", "All animals are cats"],
      correctAnswer: 0,
      difficulty: "medium",
      category: "logical",
    },
    {
      id: "q_18",
      question: "Which shape has the most sides?",
      options: ["Hexagon", "Pentagon", "Octagon", "Heptagon"],
      correctAnswer: 2,
      difficulty: "easy",
      category: "spatial",
    },
    {
      id: "q_19",
      question: "What is 25% of 80?",
      options: ["15", "20", "25", "30"],
      correctAnswer: 1,
      difficulty: "easy",
      category: "mathematical",
    },
    {
      id: "q_20",
      question: "Complete the analogy: Hot is to Cold as Light is to:",
      options: ["Bright", "Dark", "Heavy", "Fast"],
      correctAnswer: 1,
      difficulty: "easy",
      category: "verbal",
    },
  ]
}
