"use client";
import React, { useState } from "react";

const Pricing = () => {
  const [billing, setBilling] = useState("yearly");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-6">
      {/* --- LOGO --- */}
      <div className="flex items-center z-50">
        <img
          src="/logo.png"
          alt="LazyLayout Logo"
          className="w-32 md:w-40 object-contain opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold">
          Smart Pricing That Grows <br className="hidden sm:block" />
          Your Business
        </h1>
        <p className="text-gray-400 mt-4 text-sm sm:text-base">
          Each plan offers essential tools with transparent pricing and no
          hidden fees.
        </p>

        {/* Toggle */}
        <div className="mt-6 inline-flex bg-gray-900 rounded-full p-1">
          <button
            onClick={() => setBilling("yearly")}
            className={`px-6 py-2 text-sm rounded-full transition ${
              billing === "yearly" ? "bg-white text-black" : "text-gray-400"
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-sm rounded-full transition ${
              billing === "monthly" ? "bg-white text-black" : "text-gray-400"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className=" w-full flex justify-center -mt-7 -mb-18 scale-80">
        <div className="grid gap-12 grid-cols-1 lg:grid-cols-2 max-w-5xl w-full">
          {/* Standard */}
          <div className="relative rounded-3xl p-10 sm:p-12 min-h-[580px] bg-gradient-to-b from-purple-900/30 to-black border border-gray-800">
            <h3 className="text-4xl font-semibold">Standard</h3>
            <p className="text-gray-400 mt-3 text-base">
              Organize transactions and reports
            </p>

            <p className="text-5xl font-bold mt-8">
              ${billing === "yearly" ? "10" : "12"}
              <span className="text-base text-gray-400"> /mo</span>
            </p>

            <button className="mt-8 w-full py-4 rounded-full border border-gray-600 hover:border-white transition">
              Get Started
            </button>

            <ul className="mt-10 space-y-4 text-gray-300 text-xl">
              <li>✔ Progress invoicing</li>
              <li>✔ Connect bank feeds</li>
              <li>✔ Expense tracking</li>
              <li>✔ Custom reports</li>
            </ul>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl p-10 sm:p-12 min-h-[520px] bg-gradient-to-b from-blue-600/40 to-black border border-blue-500 shadow-2xl">
            <span className="absolute top-6 right-6 text-xs bg-blue-600 px-4 py-1 rounded-full">
              Most popular
            </span>

            <h3 className="text-4xl font-semibold">Premium</h3>
            <p className="text-gray-300 mt-3 text-base">
              Track projects and manage inventory
            </p>

            <p className="text-5xl font-bold mt-8">
              ${billing === "yearly" ? "20" : "24"}
              <span className="text-base text-gray-400"> /mo</span>
            </p>

            <button className="mt-8 w-full py-4 rounded-full bg-blue-600 hover:bg-blue-500 transition">
              Get Started
            </button>

            <ul className="mt-10 space-y-4 text-xl text-gray-200">
              <li>✔ Vendor bills & payments</li>
              <li>✔ Sales & purchase orders</li>
              <li>✔ Multi-currency support</li>
              <li>✔ Workflow automation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
