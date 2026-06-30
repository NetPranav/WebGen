// import React from "react";

// export default function TemplatePage() {
//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
//       {/* Background glow */}
//       <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
//         <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
//         <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
//       </div>

//       <div className="text-center max-w-xl">
//         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-8">
//           COMPONENT LIBRARY
//         </div>

//         <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
//           Templates are{" "}
//           <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
//             coming soon
//           </span>
//         </h1>

//         <p className="text-gray-400 text-lg leading-relaxed mb-10">
//           We&apos;re building a curated library of prebuilt and
//           community-contributed components. Stay tuned — this page will be home
//           to thousands of free, production-ready templates.
//         </p>

//         <a
//           href="/"
//           className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
//         >
//           Back to Home
//         </a>
//       </div>
//     </div>
//   );
// }
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Search, Heart, Download, Code2, Sparkles, LayoutTemplate, Layers, Maximize2 } from 'lucide-react';
import { getGridSpanForCategory } from "./DynamicSizing";

// --- Mock Data ---
// Removed hardcoded `gridSpan` to strictly enforce the dynamic category system
const CATEGORIES = ["All", "Hero", "Navbars", "Footers", "Features", "Pricing", "Forms", "Cards", "Testimonials"];

const MOCK_COMPONENTS = [
  { id: 1, title: "SaaS Gradient Hero", category: "Hero", image: "/hero-gradient.jpg", downloads: 1240 },
  { id: 2, title: "Glassmorphic Navbar", category: "Navbars", image: "/nav-glass.jpg", downloads: 890 },
  { id: 3, title: "Dark Bento Grid", category: "Features", image: "/bento-grid.jpg", downloads: 2100 },
  { id: 4, title: "Tiered Pricing Cards", category: "Pricing", image: "/pricing-tiers.jpg", downloads: 1120 },
  { id: 5, title: "Minimal Mega Footer", category: "Footers", image: "/footer-mega.jpg", downloads: 670 },
  { id: 6, title: "Split Screen Auth", category: "Forms", image: "/auth-split.jpg", downloads: 450 },
  { id: 7, title: "Animated Testimonial", category: "Testimonials", image: "/test-slider.jpg", downloads: 530 },
  { id: 8, title: "3D Hover Product Card", category: "Cards", image: "/card-3d.jpg", downloads: 1890 },
  { id: 9, title: "Floating Island Nav", category: "Navbars", image: "/nav-island.jpg", downloads: 1540 },
  { id: 10, title: "Newsletter CTA", category: "Forms", image: "/newsletter-cta.jpg", downloads: 820 },
];

const ComponentsLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const bgIconsRef = useRef<HTMLDivElement>(null);

  const filteredComponents = MOCK_COMPONENTS.filter(comp => {
    const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || comp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleLike = (id: number) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header text stagger entrance
      gsap.fromTo(headerRef.current?.children || [],
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
      );

      // Background SVGs floating animation
      const icons = bgIconsRef.current?.children;
      if (icons) {
        gsap.to(icons, {
          y: "random(-20, 20)",
          x: "random(-20, 20)",
          rotation: "random(-15, 15)",
          duration: "random(3, 5)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.2
        });
      }
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    // Snap-in animation when filters change
    if (gridRef.current && gridRef.current.children.length > 0) {
      gsap.fromTo(gridRef.current.children,
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "back.out(1.2)", clearProps: "all" }
      );
    }
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans overflow-hidden selection:bg-indigo-500/30 pb-24">

      {/* Background Ambience */}
      <div ref={bgIconsRef} className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <Code2 className="absolute top-[10%] left-[5%] w-64 h-64 text-white" />
        <LayoutTemplate className="absolute top-[40%] right-[10%] w-96 h-96 text-indigo-400" />
        <Layers className="absolute bottom-[10%] left-[20%] w-72 h-72 text-emerald-400" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div ref={headerRef} className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Over 100+ production-ready blocks</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            Build faster with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              beautiful components.
            </span>
          </h1>
          <p className="text-lg text-zinc-400">
            Explore our meticulously crafted library of UI elements.
            Find what you need, customize it, and download the source code instantly.
          </p>
          
          <div className="relative mt-10 max-w-xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 shadow-2xl focus-within:border-indigo-500/50 transition-colors">
              <Search className="w-6 h-6 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search for 'pricing table', 'navbar'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search components"
                className="w-full bg-transparent border-none outline-none px-4 text-white placeholder-zinc-500 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Categories */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-6 mb-8 border-b border-zinc-800/50 mask-fade-edges justify-start xl:justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${activeCategory === cat
                ? "bg-zinc-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dense Grid Setup */}
        {filteredComponents.length > 0 ? (
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-[250px] grid-flow-row-dense gap-6"
          >
            {filteredComponents.map((comp) => {
              // Get the span based on category
              const dynamicGridSpan = getGridSpanForCategory(comp.category);

              return (
                <div
                  key={comp.id}
                  className={`${dynamicGridSpan} group relative bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col`}
                >
                  {/* The Component Wrapper Sandbox */}
                  <div className="relative flex-1 bg-zinc-950/50 overflow-hidden flex items-center justify-center min-h-[150px] p-4">

                    {/* Background Gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />

                    {/* Template Rendering Area */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      {comp.image ? (
                        <img
                          src={comp.image}
                          alt={comp.title}
                          loading="lazy"
                          className="w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 ease-out rounded-lg"
                        />
                      ) : (
                        <div className="text-zinc-500 text-sm">Component renders here</div>
                      )}
                    </div>

                    {/* Overlay Badges */}
                    <div className="absolute top-4 left-4 z-20">
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-zinc-300 shadow-xl">
                        {comp.category}
                      </span>
                    </div>

                    {/* Expand Icon */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="p-3 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-300 transform scale-50 group-hover:scale-100 transition-transform duration-500 ease-out shadow-2xl">
                        <Maximize2 className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="p-5 border-t border-zinc-800/50 bg-zinc-900/90 backdrop-blur-xl shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors leading-tight line-clamp-1">
                        {comp.title}
                      </h3>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => toggleLike(comp.id)}
                          aria-label={likedItems.has(comp.id) ? "Unlike component" : "Like component"}
                          className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                        >
                          <Heart className={`w-4 h-4 ${likedItems.has(comp.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                        </button>
                        <button 
                          aria-label="Download component code"
                          className="p-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Download className="w-3.5 h-3.5" /> {comp.downloads.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-32 text-center">
            <Code2 className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">No components found</h3>
            <p className="text-zinc-600">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-edges { mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
      `}} />
    </div>
  );
};

export default ComponentsLibrary;