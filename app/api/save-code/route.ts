import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    // Parse the JSON body
    const { code, filename = "test.tsx" } = await req.json();

    console.log("Received code type:", typeof code); // Debug log
    console.log("Received code:", code); // Debug log

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Ensure code is a string
    const codeString = typeof code === "string" ? code : JSON.stringify(code);

    // Define the path where you want to save the file
    const filePath = join(process.cwd(), "app", "Generated_Page", filename);
    if(!filePath){
      const filePath = join(process.cwd(), filename);
    }
    try {
      // Write the file with the stringified code
      await writeFile(filePath, codeString, "utf-8");

      console.log(`File saved successfully: ${filePath}`);

      return NextResponse.json({
        success: true,
        message: `Code saved to ${filename}`,
        filePath: filePath,
      });
    } catch (writeError) {
      console.error("Error writing file:", writeError);
      return NextResponse.json(
        {
          error: "Failed to write file",
          details: writeError,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      {
        error: "Server error",
        details: err,
      },
      { status: 500 }
    );
  }
}
