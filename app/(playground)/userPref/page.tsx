"use client";
import React, { useState } from "react";
import Goals from "@/components/goals";
import Personality from "@/components/personality";
import Topic from "@/components/topic";
import { redirect } from "next/navigation";

export default function UserPref() {
  // frames only carry identity and element; their visual position is driven by `positionStyles`
  const [frames, setFrames] = useState([
    { id: "prime", element: <Topic /> },
    { id: "sec", element: <Goals /> },
    { id: "third", element: <Personality /> },
    { id: "fourth", element: <Personality /> },
  ]);

  // positional styles from top (0) to bottom (3). index 0 is the large/primary frame.
  const positionStyles = [
    {
      height: "75vh",
      left: "2%",
      top: "10%",
      zIndex: 3,
      boxShadow: "0 0 5px rgba(0,0,0,0.3)",
    },
    {
      height: "35vh",
      left: "calc(100% - 31vw)",
      top: "10vh",
      zIndex: 2,
      boxShadow: "0 5px 5px rgba(0,0,0,0.3)",
    },
    {
      height: "35vh",
      left: "calc(100% - 31vw)",
      top: "30vh",
      zIndex: 1,
      boxShadow: "0 5px 5px rgba(0,0,0,0.3)",
    },
    {
      height: "35vh",
      left: "calc(100% - 31vw)",
      top: "50vh",
      zIndex: 0,
      boxShadow: "0 5px 5px rgba(0,0,0,0.3)",
    },
  ];

  // Next: rotate left — the current largest (frames[0]) moves to end and becomes smallest; frames[1] becomes large.
  const [clickCount, setClickCount] = useState(0);
  function handleNext() {
    setClickCount((c: number) => c++);

    if (clickCount >= 4) {
      redirect("/template-Generator");
    }

    setFrames((prev) => {
      if (prev.length <= 1) return prev;
      return [...prev.slice(1), prev[0]];
    });
  }

  // Back: rotate right — bottom-most comes to front and becomes large.
  function handleBack() {
    setFrames((prev) => {
      if (prev.length <= 1) return prev;
      return [prev[prev.length - 1], ...prev.slice(0, prev.length - 1)];
    });
    setClickCount((c: number) => c++);
  }

  return (
    <div className={`h-full w-full`}>
      <div className={`h-18 w-max`} id="topBar">
        <img src="/logo.png" alt="WebGen" className={`w-40 invert m-4`} />
      </div>

      {/* render frames from array; style is taken from the positionStyles by index */}
      {frames.map((f, idx) => {
        const style =
          positionStyles[idx] || positionStyles[positionStyles.length - 1];
        return (
          <div
            key={f.id}
            id={f.id}
            style={{
              ...style,
              transitionTimingFunction: "ease",
              boxShadow: style.boxShadow ?? "0 0 3px rgba(0,0,0,1)",
            }}
            className={`aspect-video fixed transition-all duration-300 overflow-hidden`}
          >
            {f.element}
          </div>
        );
      })}

      <div
        style={{ boxShadow: `0 0 3px rgba(0,0,0,1)` }}
        id="nav"
        className={`h-18 w-full flex justify-between items-center fixed bottom-[0%] bg-[#ffffff] `}
      >
        <button
          onClick={handleBack}
          id="Back"
          className={`h-[80%] w-[10%] mx-[2%] text-white bg-black font-bold`}
        >
          Back
        </button>

        <button
          onClick={handleNext}
          id="Next"
          className={`h-[80%] w-[10%] mx-[2%] bg-[#000000] text-white font-bold`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
