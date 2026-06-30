"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousal() {
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // --- REFS FOR DESKTOP INTERACTION ---
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const carousalRef = useRef<HTMLDivElement>(null);
  const hoverZoneRef = useRef<"prev" | "next" | null>(null);

  // --- SWIPE REFS ---
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // --- POSITIONING ARRAYS ---
  const desktopLeft = [119, 72, 25, -22, -69];
  const mobileLeft = [200, 95, 7.5, -80, -180];
  const left = isMobile ? mobileLeft : desktopLeft;

  // --- 3D EFFECT ARRAYS ---
  const rotate = [5, 5, 0, -5, -5];
  const scale = [0.8, 0.8, 1, 0.8, 0.8];
  const y = [10, 10, 0, 10, 10];
  const brightness = [0.4, 0.4, 1.1, 0.4, 0.4];
  const opacity = [0, 1, 1, 1, 0];
  const zIndexes = [1, 5, 10, 5, 1];

  const bgImages = [
    "/Template_1.png",
    "/template_2.png",
    "/template_3.png",
    "/template_4.png",
    "/template_6.png",
  ];

  // --- INITIALIZATION ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Check immediately
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % 5);
    }, 4000);
    return () => clearInterval(id);
  }, [index]);

  // --- DESKTOP MOUSE FOLLOW LOGIC ---
  useEffect(() => {
    if (isMobile) return; // Disable this heavy logic on mobile

    function onMouseMove(e: MouseEvent) {
      const el = carousalRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      // Reset if out of bounds
      if (relY < 0 || relY > rect.height || relX < 0 || relX > rect.width) {
        hoverZoneRef.current = null;
        hideButtons();
        return;
      }

      const leftThreshold = rect.width / 3; // Wider zones for better UX
      const rightThreshold = rect.width - leftThreshold;

      if (relX < leftThreshold) {
        hoverZoneRef.current = "prev";
        moveButton(prevBtnRef.current, nextBtnRef.current, relX, relY, rect);
      } else if (relX > rightThreshold) {
        hoverZoneRef.current = "next";
        moveButton(nextBtnRef.current, prevBtnRef.current, relX, relY, rect);
      } else {
        hoverZoneRef.current = null;
        hideButtons();
      }
    }

    const moveButton = (
      activeBtn: HTMLButtonElement | null,
      inactiveBtn: HTMLButtonElement | null,
      x: number,
      y: number,
      rect: DOMRect
    ) => {
      if (activeBtn) {
        // Constrain button inside container
        const btnX = Math.max(0, Math.min(rect.width - 80, x - 40));
        const btnY = Math.max(0, Math.min(rect.height - 40, y - 20));

        activeBtn.style.left = `${btnX}px`;
        activeBtn.style.top = `${btnY}px`;
        activeBtn.style.opacity = "1";
        activeBtn.style.transform = "scale(1)";
      }
      if (inactiveBtn) {
        inactiveBtn.style.opacity = "0";
        inactiveBtn.style.transform = "scale(0.8)";
      }
    };

    const hideButtons = () => {
      if (prevBtnRef.current) {
        prevBtnRef.current.style.opacity = "0";
        prevBtnRef.current.style.transform = "scale(0.8)";
      }
      if (nextBtnRef.current) {
        nextBtnRef.current.style.opacity = "0";
        nextBtnRef.current.style.transform = "scale(0.8)";
      }
    };

    // Click handler for the invisible zones
    function onClick() {
      if (hoverZoneRef.current === "prev") setIndex((i) => (i - 1 + 5) % 5);
      if (hoverZoneRef.current === "next") setIndex((i) => (i + 1) % 5);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
    };
  }, [isMobile]);

  // --- MOBILE SWIPE LOGIC ---
  const handleNext = () => setIndex((i) => (i + 1) % 5);
  const handlePrev = () => setIndex((i) => (i - 1 + 5) % 5);

  const onTouchStart = (e: React.TouchEvent) =>
    (touchStartX.current = e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) =>
    (touchEndX.current = e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div
      ref={carousalRef}
      className="h-[50vh] md:h-[70vh] w-full relative overflow-hidden flex items-center justify-center z-10"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* --- CARDS --- */}
      {Array.from({ length: 5 }).map((_, k) => {
        const idx = (index + k) % 5;
        const isActive = idx === 2;
        return (
          <div
            key={k}
            className="absolute transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex justify-center items-center will-change-transform"
            style={{
              width: isMobile ? "85%" : "50%",
              left: left[idx] + "%",
              zIndex: zIndexes[idx],
              opacity: opacity[idx],
            }}
          >
            <div
              className={`
                relative w-full aspect-video rounded-xl shadow-2xl overflow-hidden
                transition-all duration-1000 ease-out
                ${
                  isActive
                    ? "shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/20"
                    : ""
                }
              `}
              style={{
                transform: `rotateZ(${rotate[idx]}deg) scale(${scale[idx]}) translateY(${y[idx]}%)`,
                filter: `brightness(${brightness[idx]}) blur(${
                  isActive ? 0 : 1
                }px)`,
                backgroundImage: `url(${bgImages[k]})`,
                backgroundSize: "contain",
                backgroundPosition: "top center",
              }}
            >
              {!isActive && (
                <div className="absolute inset-0 bg-black/20 transition-colors duration-1000" />
              )}
            </div>
          </div>
        );
      })}

      {/* --- DESKTOP BUTTONS (Mouse Following) --- */}
      {!isMobile && (
        <>
          <button
            ref={prevBtnRef}
            className="absolute px-6 py-3 rounded-full bg-white text-black font-semibold z-50 pointer-events-none transition-all duration-100 shadow-xl opacity-0 scale-90"
            style={{
              position: "absolute",
              transitionTimingFunction: "ease",
            }} // Positioned via JS
          >
            Previous
          </button>
          <button
            ref={nextBtnRef}
            className="absolute px-6 py-3 rounded-full bg-white text-black font-semibold z-50 pointer-events-none transition-all duration-100 shadow-xl opacity-0 scale-90"
            style={{
              position: "absolute",
              transitionTimingFunction: "ease",
            }} // Positioned via JS
          >
            Next
          </button>
        </>
      )}

      {/* --- MOBILE BUTTONS (Fixed Glass Chevrons) --- */}
      {isMobile && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-transform"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-transform"
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}