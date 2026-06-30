// "use client";
// import React from "react";
// import { Pencil, Sparkles, Download } from "lucide-react";

// const steps = [
//   {
//     icon: <Pencil className="w-6 h-6" />,
//     title: "Describe",
//     description:
//       "Type a plain-English description of your dream website layout. No coding knowledge needed.",
//   },
//   {
//     icon: <Sparkles className="w-6 h-6" />,
//     title: "Generate",
//     description:
//       "Our AI interprets your vision and builds a fully responsive, production-ready React component in seconds.",
//   },
//   {
//     icon: <Download className="w-6 h-6" />,
//     title: "Export",
//     description:
//       "Preview, tweak, and download clean code. Paste it directly into your project — it's 100% yours.",
//   },
// ];

// export default function HowItWorks() {
//   return (
//     <section className="w-full py-20 md:py-32 bg-black relative z-10">
//       <div className="max-w-5xl mx-auto px-6">
//         {/* Header */}
//         <div className="text-center mb-16 md:mb-20">
//           <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4 font-semibold">
//             How It Works
//           </p>
//           <h2 className="text-3xl md:text-4xl font-light text-white">
//             From idea to code in{" "}
//             <span className="font-semibold">three steps</span>
//           </h2>
//         </div>

//         {/* Steps */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
//           {steps.map((step, index) => (
//             <div
//               key={step.title}
//               className="scroll-reveal group relative flex flex-col items-center text-center p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500"
//             >
//               {/* Step Number */}
//               <span className="absolute top-4 right-4 text-[10px] font-mono text-gray-600 tracking-widest">
//                 0{index + 1}
//               </span>

//               {/* Icon */}
//               <div className="mb-6 p-4 rounded-xl bg-white/5 text-white border border-white/10 group-hover:border-white/20 transition-colors">
//                 {step.icon}
//               </div>

//               {/* Title */}
//               <h3 className="text-lg font-semibold text-white mb-3">
//                 {step.title}
//               </h3>

//               {/* Description */}
//               <p className="text-sm text-gray-400 leading-relaxed">
//                 {step.description}
//               </p>
//             </div>
//           ))}
//         </div>

//         {/* Connector line (desktop only) */}
//         <div className="hidden md:flex justify-center mt-12">
//           <div className="flex items-center gap-2">
//             <div className="w-16 h-px bg-gradient-to-r from-transparent to-white/20" />
//             <div className="w-2 h-2 rounded-full bg-white/20" />
//             <div className="w-32 h-px bg-white/10" />
//             <div className="w-2 h-2 rounded-full bg-white/20" />
//             <div className="w-32 h-px bg-white/10" />
//             <div className="w-2 h-2 rounded-full bg-white/20" />
//             <div className="w-16 h-px bg-gradient-to-l from-transparent to-white/20" />
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// ------------------------------------------------------------------------------------------------------------- V1

// "use client"

// import { useEffect, useRef } from 'react';
// import { gsap } from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';
// import { Code2, Wand2, Paintbrush, Download } from 'lucide-react';

// gsap.registerPlugin(ScrollTrigger);

// const steps = [
//   {
//     id: 1,
//     title: "1. Describe Your Idea",
//     description: "Simply type what you want to build in plain English. No technical jargon needed.",
//     icon: <Code2 className="w-8 h-8 text-blue-400" />,
//     color: "from-blue-500/20 to-cyan-500/20",
//     image: "/step1.jpg"
//   },
//   {
//     id: 2,
//     title: "2. AI Magic Happens",
//     description: "Our advanced models translate your words into production-ready React and Tailwind code instantly.",
//     icon: <Wand2 className="w-8 h-8 text-purple-400" />,
//     color: "from-purple-500/20 to-pink-500/20",
//     image: "/step2.jpg"
//   },
//   {
//     id: 3,
//     title: "3. Tweak & Fine-Tune",
//     description: "Use our visual editor to adjust colors, spacing, and layout until it perfectly matches your vision.",
//     icon: <Paintbrush className="w-8 h-8 text-orange-400" />,
//     color: "from-orange-500/20 to-yellow-500/20",
//     image: "/step3.jpg"
//   },
//   {
//     id: 4,
//     title: "4. Export & Deploy",
//     description: "Copy the clean, maintainable code straight into your project. You own everything.",
//     icon: <Download className="w-8 h-8 text-green-400" />,
//     color: "from-green-500/20 to-emerald-500/20",
//     image: "/step4.jpg"
//   }
// ];

// const HowItWorks = () => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const leftContentRef = useRef<HTMLDivElement>(null);
//   const rightContentRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     let ctx = gsap.context(() => {
//       const cards = gsap.utils.toArray<HTMLElement>('.step-card');
//       const texts = gsap.utils.toArray<HTMLElement>('.step-text');

//       // Native sticky used instead of GSAP pin
//       // We only animate the text opacity and images

//       // Initial state
//       gsap.set(texts[0], { opacity: 1, scale: 1.05 });

//       // Animate text visibility based on scroll position of cards
//       cards.forEach((card, i) => {
//         ScrollTrigger.create({
//           trigger: card,
//           start: 'top center',
//           end: 'bottom center',
//           onEnter: () => {
//             gsap.to(texts, { opacity: 0.2, duration: 0.3 });
//             gsap.to(texts[i], { opacity: 1, duration: 0.3, scale: 1.05 });
//           },
//           onEnterBack: () => {
//             gsap.to(texts, { opacity: 0.2, duration: 0.3 });
//             gsap.to(texts[i], { opacity: 1, duration: 0.3, scale: 1.05 });
//           },
//         });

//         // Add parallax effect to images
//         gsap.fromTo(card.querySelector('.card-image'),
//           { y: -50 },
//           {
//             y: 50,
//             ease: "none",
//             scrollTrigger: {
//               trigger: card,
//               start: "top bottom",
//               end: "bottom top",
//               scrub: true,
//             }
//           }
//         );
//       });
//     }, containerRef);

//     return () => ctx.revert();
//   }, []);

//   return (
//     <section ref={containerRef} className="bg-zinc-950 relative text-white py-24 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 relative">

//         {/* Left Side - Sticky Text Content */}
//         <div ref={leftContentRef} className="lg:w-1/2 h-screen flex flex-col justify-center sticky top-0">
//           <h2 className="text-sm font-semibold tracking-widest text-gray-400 uppercase mb-4">How it works</h2>
//           <h3 className="text-4xl md:text-6xl font-bold mb-12 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
//             From idea to code<br />in seconds.
//           </h3>

//           <div className="space-y-12">
//             {steps.map((step) => (
//               <div key={step.id} className="step-text opacity-20 transition-all duration-300 transform origin-left">
//                 <div className="flex items-center space-x-4 mb-4">
//                   <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} border border-white/10 backdrop-blur-sm`}>
//                     {step.icon}
//                   </div>
//                   <h4 className="text-2xl font-semibold">{step.title}</h4>
//                 </div>
//                 <p className="text-gray-400 text-lg leading-relaxed pl-16">
//                   {step.description}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Right Side - Scrolling Visuals */}
//         <div ref={rightContentRef} className="lg:w-1/2 pt-[50vh] pb-[50vh]">
//           <div className="space-y-32">
//             {steps.map((step) => (
//               <div key={step.id} className="step-card h-[60vh] rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden relative shadow-2xl flex items-center justify-center group">
//                 {/* Background Glow */}
//                 <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />

//                 {/* Image Container with Parallax */}
//                 <div className="absolute inset-4 rounded-2xl overflow-hidden border border-white/10">
//                   <img
//                     src={step.image}
//                     alt={step.title}
//                     className="card-image w-full h-[120%] object-cover opacity-60"
//                   />

//                   {/* Overlay Gradient */}
//                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
//                 </div>

//                 {/* Content Overlay */}
//                 <div className="relative z-10 text-center px-8">
//                   <div className={`inline-flex p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 mb-6 shadow-2xl`}>
//                     {step.icon}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//       </div>
//     </section>
//   );
// };

// export default HowItWorks;


// ------------------------------------------------------------------------------------------------------------------------------- v2

"use client"

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code2, Wand2, Paintbrush, Download } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    id: 1,
    title: "1. Describe Your Idea",
    description: "Simply type what you want to build in plain English. No technical jargon needed.",
    icon: <Code2 className="w-6 h-6 text-blue-400" />,
    color: "from-blue-500/20 to-cyan-500/20",
    image: "/step1.jpg"
  },
  {
    id: 2,
    title: "2. AI Magic Happens",
    description: "Our advanced models translate your words into production-ready React and Tailwind code instantly.",
    icon: <Wand2 className="w-6 h-6 text-purple-400" />,
    color: "from-purple-500/20 to-pink-500/20",
    image: "/step2.jpg"
  },
  {
    id: 3,
    title: "3. Tweak & Fine-Tune",
    description: "Use our visual editor to adjust colors, spacing, and layout until it perfectly matches your vision.",
    icon: <Paintbrush className="w-6 h-6 text-orange-400" />,
    color: "from-orange-500/20 to-yellow-500/20",
    image: "/step3.jpg"
  },
  {
    id: 4,
    title: "4. Export & Deploy",
    description: "Copy the clean, maintainable code straight into your project. You own everything.",
    icon: <Download className="w-6 h-6 text-green-400" />,
    color: "from-green-500/20 to-emerald-500/20",
    image: "/step4.jpg"
  }
];

export default function  HowItWorks(){
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.step-card-wrapper');
      const texts = gsap.utils.toArray<HTMLElement>('.step-text');

      // Initial state setup for text
      gsap.set(texts, { opacity: 0.2, x: -10 });
      gsap.set(texts[0], { opacity: 1, x: 0 });

      // 1. Master Scroll Snap: Controls the overall container to snap to sections
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        snap: {
          snapTo: 1 / (steps.length - 1), // Snaps exactly to each card
          duration: { min: 0.2, max: 0.5 },
          delay: 0.1, // Wait briefly after user stops scrolling to snap
          ease: "power2.inOut"
        }
      });

      // 2. Individual Triggers: Handle the text highlighting and parallax
      cards.forEach((card, i) => {
        
        // Text Opacity & Position swap
        ScrollTrigger.create({
          trigger: card,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.to(texts, { opacity: 0.3, x: -10, duration: 0.4, ease: "power2.out" });
              gsap.to(texts[i], { opacity: 1, x: 0, duration: 0.4, ease: "back.out(1.5)" });
            }
          },
        });

        // Enhanced Image Parallax
        const img = card.querySelector('.card-image');
        if (img) {
          gsap.fromTo(img,
            { scale: 1.15, y: -40 },
            {
              scale: 1,
              y: 40,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 1, // Added slight smoothing to the scrub
              }
            }
          );
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="bg-zinc-950 relative text-white pb-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row px-4 sm:px-6 lg:px-8">

        {/* Left Side - Sticky Text Content */}
        <div className="lg:w-1/2 h-screen flex flex-col justify-center sticky top-0 z-10 py-24">
          <div className="pr-12">
            <h2 className="text-sm font-semibold tracking-widest text-zinc-400 uppercase mb-4">Pipeline</h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-12 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              From prompt to code<br />in seconds.
            </h3>

            <div className="space-y-8 relative">
              {/* Optional: Subtle connecting line behind icons */}
              <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent -z-10" />

              {steps.map((step) => (
                <div key={step.id} className="step-text transition-all duration-300 transform origin-left">
                  <div className="flex items-start space-x-6">
                    <div className={`mt-1 p-3 rounded-xl bg-zinc-900/80 bg-gradient-to-br ${step.color} border border-white/5 shadow-xl`}>
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                      <p className="text-zinc-400 text-base leading-relaxed max-w-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Scrolling Visuals */}
        <div className="lg:w-1/2 w-full relative z-0">
          {steps.map((step) => (
            // The wrapper is h-screen so it fills the exact viewport, making snapping perfectly accurate
            <div key={step.id} className="step-card-wrapper h-screen w-full flex items-center justify-center pt-16 lg:pt-0">
              <div className="step-card w-full max-w-lg aspect-square lg:aspect-[4/5] rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden relative shadow-2xl group">
                
                {/* Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20 transition-opacity duration-700`} />

                {/* Image Container with Parallax */}
                <div className="absolute inset-2 rounded-2xl overflow-hidden bg-zinc-950">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="card-image w-full h-[120%] object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  {/* Overlay Gradient for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

