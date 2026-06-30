"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const SiteTopicSelector = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleTopicClick = (topic: string) => {
    console.log(`Selected topic: ${topic}`);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(`Searching for: ${searchTerm}`);
  };

  const steps = [
    "Topic",
    "Goals",
    "Site Info",
    "Homepage",
    "Pages",
    "Colors",
    "Fonts",
  ];
  const currentStep = "Topic"; // Assuming 'Topic' is the current step

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main content area */}
      <div className="flex flex-1">
        {/* Left image section */}
        <div className="w-1/3 bg-gray-200 flex items-center justify-center relative overflow-hidden">
          {/* This div represents the image on the left */}
          <img
            src="/Web-demo-playground.jpg" // Replace with your actual image path
            alt="Background fabric"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* You can add overlays or specific content for the image section here if needed */}
        </div>

        {/* Right content section */}
        <div className="w-2/3 flex flex-col justify-between p-12">
          <div className="grow flex items-start justify-center pt-24">
            {" "}
            {/* Added pt-24 for vertical alignment */}
            <div className="max-w-md w-full space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  What's your site about?
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Choosing a topic will help to personalize your website
                  building experience.
                </p>
              </div>

              <div className="relative">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center bg-gray-50 rounded-lg shadow-sm"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="search-topic"
                    name="search-topic"
                    type="text"
                    autoComplete="off"
                    required
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-transparent placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-transparent"
                    placeholder="Eg. Weddings, Fitness"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <button
                    type="submit"
                    className="shrink-0 p-3 text-gray-500 hover:text-gray-900 focus:outline-none"
                    aria-label="Search"
                  >
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </form>
              </div>

              {/* Assuming there would be popular topics list here if user hasn't typed */}
              {/* <div className="bg-white shadow overflow-hidden rounded-lg mt-4">
                <div className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Popular topics
                </div>
                <ul className="divide-y divide-gray-200">
                  {['Photography', 'Art', 'Weddings'].map((topic) => (
                    <li key={topic}>
                      <button
                        type="button"
                        onClick={() => handleTopicClick(topic)}
                        className="block w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                      >
                        <p className="text-sm font-medium text-gray-900">{topic}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div> */}
            </div>
          </div>

          {/* Bottom navigation */}
          <div className="flex justify-between items-center py-4 px-6 bg-white border-t border-gray-200">
            <nav className="flex space-x-8" aria-label="Progress">
              {steps.map((step, index) => (
                <a
                  key={step}
                  href="#"
                  onClick={() => console.log(`Navigating to ${step}`)} // Replace with actual navigation logic
                  className={`text-sm font-medium ${
                    step === currentStep
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  aria-current={step === currentStep ? "step" : undefined}
                >
                  {step}
                </a>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => console.log("Next button clicked")}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              NEXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteTopicSelector;









