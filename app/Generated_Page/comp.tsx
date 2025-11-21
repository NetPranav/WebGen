'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { FaTwitter, FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';

/**
 * Comp represents an AI website footer component with extensive GSAP animations.
 * It includes copyright, navigation links, and social media icons.
 */
export default function Comp() {
  const footerRef = useRef<HTMLDivElement>(null);
  const copyrightRef = useRef<HTMLParagraphElement>(null);
  const navLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const socialIconsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Define navigation items
  const navItems: { name: string; href: string }[] = [
    { name: 'Home', href: '#' },
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Contact', href: '#' },
    { name: 'Privacy Policy', href: '#' },
  ];

  // Define social media items
  const socialItems: { icon: React.ElementType; href: string }[] = [
    { icon: FaTwitter, href: '#' },
    { icon: FaLinkedin, href: '#' },
    { icon: FaGithub, href: '#' },
    { icon: FaInstagram, href: '#' },
  ];

  useEffect(() => {
    // GSAP Context for effective cleanup
    const ctx = gsap.context(() => {
      // Animation for the main footer container
      gsap.fromTo(
        footerRef.current,
        { autoAlpha: 0, y: 50 }, // Start state: invisible, slightly below
        { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' } // End state: visible, at original position
      );

      // Animation for the copyright text
      gsap.fromTo(
        copyrightRef.current,
        { autoAlpha: 0, y: 20 }, // Start state: invisible, slightly below
        { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power2.out' } // End state: visible, at original position
      );

      // Staggered animation for navigation links
      gsap.fromTo(
        navLinksRef.current,
        { autoAlpha: 0, y: 20 }, // Start state: invisible, slightly below
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          delay: 0.7,
          stagger: 0.1, // Each link animates after a short delay
          ease: 'power2.out',
        }
      );

      // Staggered animation for social media icons with a slight bounce
      gsap.fromTo(
        socialIconsRef.current,
        { autoAlpha: 0, scale: 0.8 }, // Start state: invisible, slightly scaled down
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.6,
          delay: 1.2,
          stagger: 0.15, // Each icon animates after a short delay
          ease: 'back.out(1.7)', // Back ease for a bounce effect
        }
      );
    }, footerRef); // Scope all animations to the footerRef element for efficient cleanup

    // Cleanup function for GSAP animations
    return () => ctx.revert();
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div
      ref={footerRef}
      className="h-full w-full bg-black text-white p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center overflow-hidden"
    >
      <div className="container mx-auto flex flex-col items-center space-y-8">
        {/* Navigation Links Section */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-lg font-medium">
          {navItems.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              // Assign ref to each link for individual animation
              ref={(el) => (navLinksRef.current[index] = el)}
              className="relative text-gray-300 hover:text-white transition-colors duration-300 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-0.5 before:bg-white before:transition-all before:duration-300 hover:before:w-full"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Social Media Icons Section */}
        <div className="flex space-x-6">
          {socialItems.map((item, index) => {
            const Icon = item.icon; // Dynamically render the icon component
            return (
              <a
                key={index}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                // Assign ref to each icon for individual animation
                ref={(el) => (socialIconsRef.current[index] = el)}
                className="text-gray-400 hover:text-white transition-transform duration-300 hover:scale-125 text-3xl"
              >
                <Icon />
              </a>
            );
          })}
        </div>

        {/* Copyright Text Section */}
        <p ref={copyrightRef} className="text-gray-500 text-sm md:text-base text-center pt-4">
          &copy; {new Date().getFullYear()} AI Template Generator. All rights reserved.
        </p>
      </div>
    </div>
  );
}