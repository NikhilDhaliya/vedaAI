import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

/**
 * Parses and extracts text content from local PDF or text files.
 * Returns empty string if parsing fails or file path is invalid.
 */
export async function parseUploadedFile(filePath: string): Promise<string> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[Parser] File not found: ${filePath}`);
      return "";
    }

    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const parsedData = await pdf(dataBuffer);
      return parsedData.text || "";
    } else {
      // Treat as plain text file (UTF-8)
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (error: any) {
    console.error(`[Parser] Failed parsing file ${filePath}:`, error.message);
    return "";
  }
}
