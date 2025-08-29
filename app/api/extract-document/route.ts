import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const fileType = file.type
    let content = ""

    if (fileName.endsWith(".txt") || fileType === "text/plain") {
      // Handle text files
      content = await extractTextFile(file)
    } else if (fileName.endsWith(".pdf") || fileType === "application/pdf") {
      // Handle PDF files
      content = await extractPdfFile(file)
    } else if (fileName.endsWith(".docx") || fileType.includes("wordprocessingml")) {
      // Handle DOCX files
      content = await extractDocxFile(file)
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "Could not extract text from document" }, { status: 400 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error extracting document:", error)
    return NextResponse.json(
      {
        error: "Failed to process document. Please try again.",
      },
      { status: 500 },
    )
  }
}

async function extractTextFile(file: File): Promise<string> {
  const text = await file.text()
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
}

async function extractPdfFile(file: File): Promise<string> {
  try {
    // Import pdf-parse dynamically
    const pdfParse = (await import("pdf-parse")).default
    const buffer = await file.arrayBuffer()
    const data = await pdfParse(Buffer.from(buffer))

    return data.text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  } catch (error) {
    console.error("Error parsing PDF:", error)
    throw new Error("Failed to extract text from PDF. The file might be corrupted or password-protected.")
  }
}

async function extractDocxFile(file: File): Promise<string> {
  try {
    // Import mammoth dynamically
    const mammothModule = await import("mammoth")
    const mammoth = mammothModule.default ?? mammothModule

    // Get the raw ArrayBuffer from the uploaded File
    const arrayBuffer = await file.arrayBuffer()

    // mammoth expects an `arrayBuffer` key (not `buffer`)
    const result = await mammoth.extractRawText({ arrayBuffer })

    return result.value
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  } catch (error) {
    console.error("Error parsing DOCX:", error)
    throw new Error("Failed to extract text from Word document. The file might be corrupted or password-protected.")
  }
}
