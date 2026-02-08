import mammoth from "mammoth";

// Define the extracted text type
export type ExtractedText = {
  text: string;
  detectedMimeType: string;
};

// Extract text from PDF using pdfjs-dist
export async function extractTextFromUpload(
  file: File
): Promise<ExtractedText> {
  const mime = file.type || "application/octet-stream";

  if (mime === "text/plain" || mime === "text/markdown") {
    return { text: await file.text(), detectedMimeType: mime };
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer: buf });
    return { text: result.value ?? "", detectedMimeType: mime };
  }

  // Legacy .doc uploads are browser/OS dependent; many browsers will report this MIME.
  // mammoth does NOT support .doc (binary Word) reliably, so we reject it with a clear error.
  if (mime === "application/msword") {
    throw new Error(
      "Unsupported Word format (.doc). Please upload .docx or .txt instead."
    );
  }

  throw new Error(`Unsupported mime type: ${mime}`);
}
