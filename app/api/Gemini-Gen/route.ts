import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {

  try {
    const { code } = await req.json();
    console.log(`\n\n[API: Gemini-Gen] 🔵 New code generation request received.`);
    
    if (!code) {
      console.log(`[API: Gemini-Gen] 🔴 Error: Missing Code payload.`);
      return NextResponse.json({ error: "Missing Code" }, { status: 400 });
    }
    
    console.log(`[API: Gemini-Gen] ⏳ Calling Google GenAI (gemini-2.5-flash) for code generation via native fetch...`);

    const apiKey = process.env.GEN_API_KEY_5;
    if (!apiKey) {
      throw new Error("GEN_API_KEY_5 is not set");
    }

    const systemInstruction = ` 
        You are a Next.js code generator that creates React components with GSAP animations and Tailwind CSS.

STRICT EXECUTION:

ALWAYS parse and use the specifications provided from Model 1

// ADD THIS RULE:
NEVER use 'h-screen' or 'min-h-screen' in the root div. Use 'min-h-full' instead.
NEVER use 'fixed' positioning for the main container.

YOUR RESPONSIBILITIES:

1. Follow the User Instructions CareFully 

2. Generate only that what is asked 

3. Generate clean, production-ready Next.js code

4. Implement smooth GSAP animations

5. Use Tailwind CSS for styling

6. Follow user requirements precisely

7. Use standard HTML \`<img>\` tags for images from Unsplash. **NEVER import \`next/image\` or declare an \`Image\` variable/function**, as it conflicts with the preview sandbox environment.

8. Try to make the components scalable and reponsive 

9. Use percent in height and width where necessarry 

STRICT EXECUTION:

ALWAYS parse and use the specifications provided from Model 1

Remeber That there is only this icons available  ChevronLeft, Download, MessageSquare, RefreshCw, Send, Sparkles, X, MoveVertical, Sun, Moon, DollarSign, PlayCircle, Mail, Lock, Eye

ALWAYS output your code inside  code blocks

ALWAYS start with 'use client' directive

Implement high-quality, smooth animations using GSAP

Follow all technical requirements provided in the input

CODE STRUCTURE:

Use proper TypeScript types

Include GSAP imports and cleanup

Style main container as h-full w-full

Ensure responsive design

Create single page.tsx files only

Generate the code based on the detailed specifications you receive, focusing on creating visually appealing components with excellent animations.
remeber the format of output should be 
\`\`\`
//code 
\`\`\`
next js code should be inside \`\`\` \`\`\` this quotes :
        `;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: code }]
          }
        ]
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errorData}`);
    }

    const data = await res.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("Invalid response format from Gemini API");
    }
    
    console.log(`[API: Gemini-Gen] ✅ Code generation successful! Output length: ${generatedText.length} chars`);
    return NextResponse.json({ text: generatedText });
  } catch (err: any) {
    console.error(`[API: Gemini-Gen] ❌ SERVER ERROR:`, err.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
