"use client";
import { redirect } from "next/navigation";
import React, { useState, useEffect } from "react";

export default function Hero() {
  // const [fadeIn, setFadeIn] = useState(false);
  const [top, setTop] = useState(50);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    function handleFadeIn() {
      setTop(0);
      setOpacity(1)
    }
    window.addEventListener("load", handleFadeIn);
  }, []);

  const handleGetStartedButton = () => redirect("/userPref");

  return (
    <div
      style={{
        top: `${top}px`,
        opacity: `${opacity}`
      }}
      className={`h-[70vh] w-full flex flex-col justify-center items-center relative transition-all duration-1000 ease z-4`}
    >
      <h1 className="text-[50px] w-[600px] mt-[100px] text-white text-center">
        Just Type, and Watch It Come to Life.
      </h1>
      <div
        className="flex justify-center items-center bg-white text-black py-6 px-8 mt-[50px] cursor-pointer"
        onClick={handleGetStartedButton}
      >
        GET STARTED
      </div>
    </div>
  );
}
