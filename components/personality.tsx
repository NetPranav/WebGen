"use client";

import React, { useState } from "react";

export default function PersonalitySelector() {
  const [title, setTitle] = useState("Your Site Title");
  const [selectedPersonality, setSelectedPersonality] =
    useState("Professional");
  const [previewText, setPreviewText] = useState([
    "Introduce your brand",
    "Time to let your brand shine",
    "Reveal the heart of your brand",
    "Bring your brand to life",
    "Define your brand with confidence",
    "Show the world your brand'spark",
    "Unveil your brand's spirit",
  ]);

  const [idx, setIdx] = useState(0);

  const personalities = [
    "Professional",
    "Playful",
    "Sophisticated",
    "Friendly",
    "Bold",
    "Quirky",
    "Innovative",
  ];

  const handleTitleChange = (e: any) => {
    setTitle(e.target.value);
  };

  function handlePersonalityClick(personality: any, index: number) {
    setSelectedPersonality(personality);
    setIdx(index);
  }

  return (
    <div className="flex h-full w-full bg-gray-100 font-sans overflow-hidden">
      {/* LEFT PANEL - PREVIEW AREA */}
      <div
        id={"hello"}
        className="relative flex-1 flex items-center justify-center p-8 lg:p-12 overflow-hidden"
      >
        {/* Blurred Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"
            alt="Background"
            className="w-full h-full object-cover filter blur-2xl scale-110 opacity-50"
          />
          <div className="absolute inset-0 bg-black/5"></div>
        </div>

        {/* The Website Preview Card */}
        <div className="relative z-10 w-full max-w-5xl aspect-video bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
          {/* Preview Header */}
          <div className="h-16 px-8 flex items-center justify-between border-b border-gray-50">
            <h1 className="text-xl font-semibold text-gray-800 truncate max-w-[60%]">
              {title || "Your Site Title"}
            </h1>
            <div className="flex gap-6 text-sm text-gray-500">
              <span>About</span>
              <span>Contact</span>
            </div>
          </div>

          {/* Preview Body (Hero Section) */}
          <div className="flex-1 relative bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
              alt="Hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <h2 className="text-5xl font-light text-white tracking-tight drop-shadow-md">
                {previewText[idx] || "Introduce your brand"}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - CONFIGURATION SIDEBAR */}
      <div className="w-full lg:w-[400px] xl:w-[350px] bg-white h-full shadow-xl z-20 flex flex-col border-l border-gray-200">
        {/* Header / Close Button */}
        <div className="p-6 flex justify-end">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="space-y-8">
            {/* Heading */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Choose a site title and brand personality
              </h2>
            </div>

            {/* Site Title Input */}
            <div className="space-y-3">
              <label
                htmlFor="site-title"
                className="block text-sm font-bold text-gray-900"
              >
                Site title
              </label>
              <p className="text-sm text-gray-500">
                This is the name of your site. You can change it later.
              </p>
              <div className="relative group">
                <input
                  type="text"
                  id="site-title"
                  value={title}
                  onChange={handleTitleChange}
                  maxLength={100}
                  className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                  placeholder="Your site title"
                />
                <span className="absolute right-3 top-3.5 text-xs text-gray-400">
                  {100 - title.length}
                </span>
              </div>
            </div>

            {/* Brand Personality Grid */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-900">
                Brand personality
              </label>
              <p className="text-sm text-gray-500">
                Each personality has a unique set of colors, fonts, and tone.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {personalities.map((personality, index) => (
                  <button
                    key={personality}
                    onClick={() => handlePersonalityClick(personality, index)}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-lg border transition-all duration-200 text-left
                      ${
                        selectedPersonality === personality
                          ? "border-black bg-gray-50 text-black ring-1 ring-black"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {personality}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Optional - keeping consistent with flow) */}
        <div className="p-6 border-t border-gray-100">
          <button className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
