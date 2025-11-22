"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Babel from "@babel/standalone";
import gsap from "gsap";

// Define a type for our chat messages
type Message = {
  role: "user" | "ai";
  text: string;
};

function DynamicComponent({ code }: { code: string }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const scope: any = {
      React,
      useState,
      useEffect,
      useRef,
      gsap,

    };

    try {
      let cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, "");
      if (cleanCode.includes("export default function")) {
        cleanCode = cleanCode.replace(
          /export\s+default\s+function/,
          "const _tempComp = function"
        );
      } 
      else if (cleanCode.includes("export default")) {
        cleanCode = cleanCode.replace(
            /export\s+default/, 
            "const _tempComp ="
        );
      } else {
        cleanCode = cleanCode + "; const _tempComp = null;"; 
      }
      const transformed = Babel.transform(cleanCode, {
        presets: ["react", "typescript"],
        filename: "component.tsx",
      }).code;
      const scopeKeys = Object.keys(scope);
      const scopeValues = Object.values(scope);

      const func = new Function(...scopeKeys, transformed + "; return _tempComp;");
      
      const GeneratedComponent = func(...scopeValues);

      if (GeneratedComponent) {
        setComponent(() => GeneratedComponent);
        setError(null);
      } else {
        throw new Error("Could not determine which component to render.");
      }

    } catch (err: any) {
      console.error("Render Error:", err);
      setError(err.message);
    }
  }, [code]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-mono text-sm overflow-auto h-full">
        <strong>Render Error:</strong> {error}
      </div>
    );
  }

  if (!Component) return <div>Loading preview...</div>;

  return <Component />;
}

const downloadCompFile = async () => {
  try {
    // Try to get the blob URL from localStorage first
    const blobUrl = localStorage.getItem('lastSavedBlobUrl');
    
    if (blobUrl) {
      // Download directly from blob storage
      console.log("Downloading from blob URL:", blobUrl);
      const response = await fetch(blobUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from blob: ${response.status}`);
      }
      
      const codeText = await response.text();
      
      const blob = new Blob([codeText], { type: 'text/typescript' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'comp.tsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Component downloaded successfully from blob storage');
    } else {
      // Fallback to memory store if no blob URL found
      console.log("No blob URL found, falling back to memory store");
      const response = await fetch('/api/get-component');
      const data = await response.json();
      
      if (data.code) {
        const blob = new Blob([data.code], { type: 'text/typescript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'comp.tsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Component downloaded from memory store');
      } else {
        console.error('No component code found');
        alert('No component code available to download. Please generate a component first.');
      }
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Error downloading component. Please try again.');
  }
};

function extractCodeFromResponse(markdownText: string): string {
  if (!markdownText) return '';
  
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript)?\s*\n?([\s\S]*?)```/;
  const match = markdownText.match(codeBlockRegex);
  let extractedCode = '';
  if (match && match[1]) {
    extractedCode = match[1].trim();
  } else {
    extractedCode = markdownText.trim();
  }
  
  if (extractedCode && !extractedCode.includes("'use client'") && !extractedCode.includes('"use client"')) {
    extractedCode = "'use client';\n" + extractedCode;
  }
  
  return extractedCode;
}

const saveCodeToFile = async (extractedCode: string, filename = "comp.tsx") => {
  try {
    if (typeof extractedCode !== "string") {
      extractedCode = JSON.stringify(extractedCode);
    }

    // Save to our memory store
    const storeResponse = await fetch("/api/get-component", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: extractedCode,
      }),
    });

    if (storeResponse.ok) {
      console.log("Component code stored in memory");
      
      // Also save to blob storage for persistence
      const blobResponse = await fetch("/api/save-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: extractedCode,
          filename: filename,
        }),
      });

      const result = await blobResponse.json();
      
      if (blobResponse.ok) {
        console.log("File saved to blob storage:", result);
        
        // Store the blob URL for later download
        if (result.url) {
          localStorage.setItem('lastSavedBlobUrl', result.url);
          console.log("Blob URL stored for download:", result.url);
        }
        
        return result;
      } else {
        console.error("Error saving to blob:", result.error);
        // Still return success since we stored in memory
        return { success: true, message: "Code stored in memory" };
      }
    } else {
      console.error("Error storing component in memory");
      return null;
    }
  } catch (error) {
    console.error("Failed to save file:", error);
    return null;
  }
};

export default function AIWebsiteGenerator() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [componentCode, setComponentCode] = useState<string>("");
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatExpanded]);

  const handleSubmitPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userPrompt = prompt;
    setPrompt("");
    setIsGenerating(true);
    setHasGeneratedContent(true);

    setChatHistory((prev) => [...prev, { role: "user", text: userPrompt }]);

    try {
      const res = await fetch("./api/Gemini-talk/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Your name is Coffee&Code Ai. User Says: ${userPrompt}`,
        }),
      });

      const data = await res.json();

      if (data.text) {
        setChatHistory((prev) => [...prev, { role: "ai", text: data.text }]);

        const codeBlockMatch = data.text.match(
          /```(?:html|xml|css|js|jsx|tsx)?\s*([\s\S]*?)```/
        );

        if (codeBlockMatch && codeBlockMatch[1]) {
          const extractedCode = codeBlockMatch[1].trim();
          console.log("Extracted Code:", extractedCode);

          const secondRes = await fetch("./api/Gemini-Gen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: extractedCode,
            }),
          });
          const webData = await secondRes.json();
          
          const finalCode = extractCodeFromResponse(webData.tex);
          await saveCodeToFile(finalCode, "comp.tsx");
          
          // Store the code in state for the dynamic component
          setComponentCode(finalCode);

          if (webData.tex) {
            console.log(webData);
            setIsChatExpanded(false);
          } else {
            console.log("No code block found in response to extract.");
          }
        }
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: "ai", text: "Failed to generate response." },
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to AI." },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleChatExpand = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  const handleReloadPreview = () => {
    setReloadKey(prev => prev + 1);
  };

  // Simple fallback component
  const SimpleComponent = () => (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Generated Component</h1>
      <p className="text-gray-600">Your AI-generated component will appear here.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-white text-gray-900 font-sans overflow-hidden">
      {/* TOP HEADER */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0 bg-white z-10">
        <div className="flex items-center space-x-2">
          <div className="text-xs font-bold uppercase tracking-widest text-black">
            <img src="/logo.png" alt="WebGen" className="w-48 invert" />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 border border-gray-200">
            JD
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT SIDEBAR (CHAT COMPACT) */}
        {!isChatExpanded && (
          <aside className="hidden md:flex w-64 bg-gray-50 border-r border-gray-200 shrink-0 flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Chat
              </h2>
              <button
                onClick={toggleChatExpand}
                className="text-gray-400 hover:text-black transition-colors"
                title="Expand Chat"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {chatHistory.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Start a conversation...
                </p>
              ) : (
                <ul className="space-y-4">
                  {chatHistory.map((msg, index) => (
                    <li
                      key={index}
                      className={`text-sm ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block p-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-gray-200 text-gray-800"
                            : "bg-white border border-gray-200 text-gray-600"
                        }`}
                      >
                        <p className="line-clamp-3">{msg.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div ref={chatEndRef} />
            </div>
          </aside>
        )}

        {/* CENTER MAIN AREA */}
        <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
          {isChatExpanded ? (
            // === EXPANDED CHAT VIEW ===
            <div className="flex-1 h-full overflow-hidden flex flex-col p-6 bg-gray-50 animate-in fade-in duration-300">
              {/* Header - This will now stay fixed at the top */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 shrink-0">
                <h2 className="text-lg font-bold text-gray-800">
                  Conversation
                </h2>
                <button
                  onClick={toggleChatExpand}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Close Chat
                </button>
              </div>

              {/* Scrollable Message List */}
              <div className="flex-1 overflow-y-auto space-y-6 px-4 md:px-20 pb-4">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-2xl overflow-x-auto ${
                        msg.role === "user"
                          ? "bg-black text-white rounded-br-none"
                          : "bg-white border border-gray-200 shadow-sm text-gray-800 rounded-bl-none"
                      }`}
                    >
                      <div className="text-xs opacity-50 mb-1 uppercase font-bold">
                        {msg.role === "user" ? "You" : "Coffee&Code AI"}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-none">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : (
            // === WEBSITE PREVIEW VIEW (Default) ===
            <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-center justify-center bg-dot-pattern">
              {!hasGeneratedContent && !isGenerating ? (
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Ready to create
                  </h3>
                  <p className="text-sm text-gray-500">
                    Describe your dream website in the prompt bar below to get
                    started.
                  </p>
                </div>
              ) : (
                <div
                  className={`w-full h-full max-w-6xl bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden transition-opacity duration-500 ${
                    isGenerating ? "opacity-50 animate-pulse" : "opacity-100"
                  }`}
                >
                  {/* Browser Mockup Header */}
                  <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="ml-4 flex-1 bg-white h-6 rounded-md text-xs flex items-center px-2 text-gray-400">
                      localhost:3000
                    </div>
                    <div>
                      <button
                      onClick={handleReloadPreview}>
                        ↻ Reload
                      </button>
                    </div>
                  </div>

                  {/* The Actual Preview Content - Render React Component Directly */}
                  <div className="w-full h-full" key={reloadKey}>
        {componentCode ? (
          <DynamicComponent code={componentCode} />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-2"></div>
            <p className="text-sm text-gray-500">Generating Interface...</p>
          </div>
        ) : (
          <SimpleComponent />
        )}
      </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM INPUT PROMPT AREA */}
      <footer className="shrink-0 p-6 bg-white border-t border-gray-200 z-20">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmitPrompt}
            className="relative flex items-center w-full shadow-lg rounded-2xl overflow-hidden ring-1 ring-gray-100"
          >
            <div className="absolute left-4 text-gray-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Ask Coffee&Code AI..."
              className="w-full pl-12 pr-32 py-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none text-base"
              disabled={isGenerating}
            />
            <div className="absolute right-2">
              <button
                type="submit"
                className={`
                        px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                        ${
                          prompt.trim() && !isGenerating
                            ? "bg-black text-white hover:bg-gray-800 shadow-md"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }
                    `}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </div>
        <div>
        {componentCode && (
          <button 
            className="absolute right-12 bottom-22 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 shadow-md"
            onClick={downloadCompFile}
          >
            Download Component
          </button>
        )}
      </div>
      </footer>
    </div>
  );
}