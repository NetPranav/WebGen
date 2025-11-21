"use client";
import React, { useState } from "react";
import { Scan, SquareCheck, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Goals() {
  const options = [
    "Build community",
    "Collect donations", 
    "Get appointments",
    "Offer a contact form",
    "Publish a blog or other media",
    "Sell memberships",
    "Sell products",
    "Sell services", 
    "Send invoices",
    "Showcase work/expertise",
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const [cancel, setCancel] = useState(false);

  const toggleSelection = (option: string) => {
    if (selected.includes(option)) {
      setSelected(selected.filter((item) => item !== option));
    } else {
      setSelected([...selected, option]);
    }
  };

  const EmptyCheckbox = () => <Scan className="mr-3" />;
  const CheckedCheckbox = () => <SquareCheck className="mr-3" />;
  
  const handleCancel = () => {
    setCancel(true);
  };

  return (

    <div id="main" className={`flex justify-center items-center h-full w-full bg-[rgba(0,0,0,0)] backdrop-blur-2xl`}>
      {/* <div id="cancel" className="absolute top-10 right-20 cursor-pointer" onClick={handleCancel}>
        <X />
      </div> */}
      
      {cancel && (
  <div className="fixed inset-0 flex justify-center items-center z-50  bg-opacity-50 ">
    <div id="cancel-confirm" className="bg-white h-54 w-80 rounded-lg flex flex-col justify-between p-6 shadow-xl">
      {/* Header */}
      <div id="text-confirm" className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <X className="text-red-600 w-6 h-6" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Do Your Want to Exit ?</h3>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-3">
        <button 
          id="button-cancel" 
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          onClick={() => setCancel(false)}
        >
          Cancel
        </button>
        <button 
          id="button-confirm"
          className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          onClick={() => {
            console.log("Confirmed exit");
            redirect("./")
          }}
        >
          Exit
        </button>
      </div>
    </div>
  </div>
)}

      <div id="centered-div" className={`w-[80%] h-[90%]
        ${
        cancel ? 'blur-lg':'blur-none'
    }
        `}>
        <div id="question" className="text-2xl text-center pt-5">
          <h1>What do you want to do with your website?</h1>
        </div>
        <div id="discrption" className="text-center text-gray-400">
          <p>
            Kickstart your site building experience by choosing options that fit
            what your site is used for.
          </p>
        </div>
        <div id="options" className="grid grid-cols-2 gap-4 pt-[5%]">
          {options.map((option, index) => {
            const isSelected = selected.includes(option);
            return (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                  isSelected
                    ? "border-gray-500 bg-blue-50 text-gray-700"
                    : "border-gray-300 bg-[#f9f9f9] hover:bg-gray-200"
                }`}
                onClick={() => toggleSelection(option)}
              >
                {isSelected ? <CheckedCheckbox /> : <EmptyCheckbox />}
                {option}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}