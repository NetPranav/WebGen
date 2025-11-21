"use client";
import React, { useEffect, useRef, useState } from "react";

export default function Carousal() {
  const [index, setIndex] = useState(0);
  const left = [119, 72, 25, -22, -69];
  const rotate = [3, 3, 0, -3, -3];
  const scale = [0.9, 0.9, 1, 0.9, 0.9];
  const y = [20, 20, 0, 20, 20];
  const bright = [0.7, 0.7, 1, 0.7, 0.7];
  const cursor = ["pointer", "pointer", "default", "pointer", "pointer"];
  const opacity = [0, 1, 1, 1, 0];
  const bgImages = [
    "/Template_1.png",
    "/Template_2.png",
    "/Template_3.png",
    "/Template_4.png",
    "/Template_6.png",
  ];

  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const carousal = useRef<HTMLDivElement>(null);
  const hoverZoneRef = useRef<"prev" | "next" | null>(null);
  const [hoverZone, setHoverZone] = useState<"prev" | "next" | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % 5);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const el = carousal.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      if (relY < 0 || relY > rect.height || relX < 0 || relX > rect.width) {
        hoverZoneRef.current = null;
        setHoverZone(null);
        if (prev.current) {
          // prev.current.style.left = "0px";
          // prev.current.style.top = "40%";
          prev.current.style.opacity = "0";
          prev.current.style.scale = "0.8";
        }
        if (next.current) {
          // next.current.style.left = `${Math.max(0, rect.width - 100)}px`;
          // next.current.style.top = "40%";
          next.current.style.opacity = "0";
          next.current.style.scale = "0.8";
        }
        return;
      }
      const leftThreshold = rect.width / 4;
      const rightThreshold = rect.width - leftThreshold;
      if (relX < leftThreshold) {
        hoverZoneRef.current = "prev";
        setHoverZone("prev");
        if (prev.current) {
          const px = Math.max(
            0,
            Math.min(rect.width - 48, relX - 40 + 32 + 10)
          );
          const py = Math.max(
            0,
            Math.min(rect.height - 24, relY - 20 + 24 + 10)
          );
          prev.current.style.left = `${px}px`;
          prev.current.style.top = `${py}px`;
          prev.current.style.opacity = "1";
          prev.current.style.scale = "1";
        }
        if (next.current) {
          next.current.style.opacity = "0";
          next.current.style.scale = "0.8";
        }
      } else if (relX > rightThreshold) {
        hoverZoneRef.current = "next";
        setHoverZone("next");
        if (next.current) {
          const nx = Math.max(
            0,
            Math.min(rect.width - 48, relX - 40 + 32 + 10)
          );
          const ny = Math.max(
            0,
            Math.min(rect.height - 24, relY - 20 + 24 + 10)
          );
          next.current.style.left = `${nx}px`;
          next.current.style.top = `${ny}px`;
          next.current.style.opacity = "1";
          next.current.style.scale = "1";
        }
        if (prev.current) {
          prev.current.style.opacity = "0";
          prev.current.style.scale = "0.8";
        }
      } else {
        hoverZoneRef.current = null;
        setHoverZone(null);
        if (prev.current) {
          prev.current.style.opacity = "0";
          prev.current.style.scale = ".8";
        }
        if (next.current) {
          next.current.style.opacity = "0";
          next.current.style.scale = ".8";
        }
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    function onClick() {
      const zone = hoverZoneRef.current;
      if (zone === "prev") {
        setIndex((i) => (i - 1 + 5) % 5);
      } else if (zone === "next") {
        setIndex((i) => (i + 1) % 5);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const carousalStyle =
    "h-[60vh] w-full mb-[350px] relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-transparent from-50% to-black to-50% z-4";
  const frameStyle =
    "absolute h-full w-[50%] transition-[left] duration-1000 ease-out flex justify-center items-center";
  const bannerStyle =
    "h-[90%] w-[90%] origin-center transition-all duration-1000 ease-out text-6xl font-bold flex items-center justify-center rounded-xl";

  return (
    <div ref={carousal} id="carousal" className={`${carousalStyle}`}>
      {Array.from({ length: 5 }).map((_, k) => {
        const idx = (index + k) % 5;
        return (
          <div
            key={k}
            className={`absolute ${frameStyle}`}
            style={{
              left: left[idx] + "%",
              cursor: cursor[idx],
            }}
          >
            <div
              className={bannerStyle}
              style={{
                transform: `rotateZ(${rotate[idx]}deg) scale(${scale[idx]}) translateY(${y[idx]}px)`,
                filter: `brightness(${bright[idx]})`,
                opacity: opacity[idx],
                backgroundImage: `url(${
                  bgImages[k + 1] || "/Template_10.png"
                })`,
                backgroundSize: `cover`,
              }}
              id={`b${k + 1}`}
            ></div>
          </div>
        );
      })}
      <button
        ref={prev}
        style={{
          transitionTimingFunction: "ease",
        }}
        className={` opacity-[0] scale-[.8] absolute top-[40%] left-[30%] px-4 py-3 rounded-3xl bg-white  transition-[left,top,opacity,scale] duration-200 `}
        onClick={() => setIndex((i) => (i - 1 + 5) % 5)}
      >
        Previous
      </button>
      <button
        style={{
          transitionTimingFunction: "ease",
        }}
        ref={next}
        className={` opacity-[0] scale-[.8] absolute top-[40%] left-[70%] px-4 py-3 rounded-3xl bg-white transition-[left,top,opacity,scale] duration-200`}
        onClick={() => setIndex((i) => (i + 1) % 5)}
      >
        Next
      </button>
    </div>
  );
}
