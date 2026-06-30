"use client";
import React, { useState } from "react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

 const faqs = [
    {
      question: "Is the generated code actually maintainable?",
      answer: "We hate spaghetti code as much as you do. LazyLayout generates semantic HTML5 and standard Tailwind CSS classes. It's clean, structured, and ready to be pasted into your production codebase."
    },
    {
      question: "Do I need coding experience to use this?",
      answer: "Not a single line. You describe your vision in plain English (e.g., 'A minimalist portfolio for a photographer'), and our AI constructs the layout for you."
    },
    {
      question: "Can I use the designs for commercial projects?",
      answer: "Yes! Once you export the code, it's 100% yours. You can use it for client work, personal projects, or your own startup without any attribution."
    },
    {
      question: "What frameworks do you support?",
      answer: "Currently, we prioritize React and HTML/Tailwind. We are rolling out support for Vue and Svelte in the coming weeks."
    },
    {
      question: "How does the 'Magic' input work?",
      answer: "We use advanced LLMs fine-tuned specifically on modern UI principles. It understands context, spacing, and typography better than generic AI models."
    }
  ];

  return (
    <section className="py-12 md:py-24 bg-gray-50 mb-0 md:mb-[350px] bg-[linear-gradient(to_bottom,black_0%_2%,white_3%_97%,black_98%_100%)] relative z-10">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-4">
            Frequently Asked <span className="font-medium">Questions</span>
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            Everything you need to know about the product and billing.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              id={`Q${index}`}
              // Add the 'scroll-reveal' class here
              className="scroll-reveal bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex justify-between items-center p-4 md:p-6 text-left focus:outline-none"
              >
                <span
                  className={`text-base md:text-lg font-medium pr-4 ${
                    openIndex === index ? "text-black" : "text-gray-700"
                  }`}
                >
                  {faq.question}
                </span>
                <div className="shrink-0">
                  <div
                    className={`w-6 h-6 flex items-center justify-center transition-transform duration-300 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  >
                    {openIndex === index ? (
                       <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
                    ) : (
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                    )}
                  </div>
                </div>
              </button>

              <div
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index
                    ? "max-h-64 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-6 pt-0 text-sm md:text-base text-gray-500 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Footer */}
        <div className="mt-8 md:mt-12 text-center">
          <p className="text-sm md:text-base text-gray-500">
            Still have questions?{" "}
            <a href="#" className="text-gray-900 font-medium underline hover:text-black">
              Chat to us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}