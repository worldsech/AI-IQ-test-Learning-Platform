import { type NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const { message, iqScore, chatHistory, hasDocuments } = await request.json()

    // Updated IQ classification based on standard deviations from mean (100)
    let learningLevel = "MEDIUM"
    let levelDescription = "Average to High Average"

    if (iqScore < 90) {
      learningLevel = "LOW"
      levelDescription = "Below Average (Extremely Low to Low Average)"
    } else if (iqScore >= 90 && iqScore <= 119) {
      learningLevel = "MEDIUM"
      levelDescription = "Average to High Average"
    } else if (iqScore > 119) {
      learningLevel = "HIGH"
      levelDescription = "Superior to Very Superior/Gifted"
    }

    const documentContext = hasDocuments
      ? "\n\nIMPORTANT: The user has uploaded documents for this conversation. The document content is included in their message after 'REFERENCE DOCUMENTS:'. Use this content to answer questions, provide analysis, explanations, and insights. Reference specific parts of the documents when helpful and cite the document name when referencing content."
      : ""

    const systemPrompt = `You are an AI learning assistant. The user has an IQ score of ${iqScore}, which falls in the ${levelDescription} range (${learningLevel} category).

    Tailor your responses based on their cognitive level:

    LOW IQ (Below 90 - Extremely Low to Low Average):
    - Use simple, clear language and avoid jargon
    - Break down complex concepts into small, manageable steps
    - Provide concrete examples and real-world applications
    - Use repetition and reinforcement to aid understanding
    - Be patient and encouraging, building confidence
    - Focus on practical, hands-on learning approaches
    - Use analogies and visual descriptions when possible

    MEDIUM IQ (90-119 - Average to High Average):
    - Provide clear, thorough explanations with moderate detail
    - Balance theoretical concepts with practical applications
    - Use standard educational language appropriate for general audiences
    - Offer examples and practice opportunities
    - Encourage critical thinking with guided questions
    - Provide structured learning paths with clear objectives
    - Mix different learning approaches (visual, auditory, kinesthetic)

    HIGH IQ (Above 119 - Superior to Very Superior/Gifted):
    - Use sophisticated language and technical terminology when appropriate
    - Provide in-depth analysis and theoretical frameworks
    - Challenge with complex problems and abstract concepts
    - Encourage independent exploration and research
    - Offer multiple perspectives and nuanced discussions
    - Connect concepts across different domains and disciplines
    - Stimulate creative and innovative thinking
    - Provide advanced resources and further reading suggestions

    Always be encouraging, supportive, and adapt your teaching style to help the user learn most effectively based on their cognitive profile. Focus on building understanding rather than just providing information.${documentContext}`

    // Build conversation history
    const conversationHistory =
      chatHistory?.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })) || []

    console.log(
      `Making request to Gemini API for chat (IQ: ${iqScore}, Level: ${learningLevel}, Has Docs: ${hasDocuments})...`,
    )

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
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            ...conversationHistory,
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      },
    )

    if (!response.ok) {
      console.error("Gemini API response not ok:", response.status, response.statusText)
      const errorText = await response.text()
      console.error("Error response:", errorText)
      return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 })
    }

    const data = await response.json()
    console.log("Gemini API chat response received")

    // Check if response has the expected structure
    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      console.error("Unexpected API response structure:", data)
      return NextResponse.json({
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
      })
    }

    const aiResponse = data.candidates[0].content.parts[0].text

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({
      response: "I'm sorry, I encountered an error while processing your request. Please try again.",
    })
  }
}
