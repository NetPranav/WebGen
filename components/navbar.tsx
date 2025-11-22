"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Bell } from "lucide-react";
import SignOutButton from "./signOutButton";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [showNotification, setShowNotification] = useState(false);

  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  const handleNotificationClick = () => {
    setShowNotification(!showNotification)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotification){
        setShowNotification(false)
      }
    };
    document.addEventListener('mousedown',handleClickOutside)
    return () => document.removeEventListener('mousedown',handleClickOutside)
  },[showNotification])

  useEffect(() => {
    if (session) {
      console.log("USER LOGGED IN:", session.user);
    }
  }, [session]);

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.getElementById("navBar");

      if (window.scrollY > 50) {
        nav!.style.background = "rgba(0, 0, 0)"; // Dark background when scrolled
      } else {
        nav!.style.background = "transparent"; // Transparent at top
      }
    };
    // done check kr
    // n

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      id="navBar"
      className={`w-full h-18 flex justify-around text-white fixed z-99`}
    >
      <div
        className="h-full pl-[2%] w-[18%] flex justify-center items-center -mt-1"
        id="logo"
      >
        <img src="/logo.png" alt="LazyLayout Logo" className="w-48"/>
      </div>
      <div
        className="h-full w-[60%] flex justify-center gap-[25px]"
        id="navOps"
      >
        <div
          className="h-full w-[10%] flex justify-center items-center"
          id="op1"
        >
          PRODUCTS
          <img src="/chevron-down.png" className="h-[15px]" />
        </div>
        <div className="h-full w-[10%] flex justify-end  items-center" id="op2">
          RESOURCES
          <img src="/chevron-down.png" className="h-[15px]" />
        </div>
      </div>

{session && session?.user ? (
  <>
  <div className="h-full w-[8%]"></div>
  <div className="h-full w-[10%] pr-[2%] flex items-center" id="signInUp"> {/* Changed from 18% to 5% */}
    <div className="h-[full] w-full flex justify-center items-center"> {/* Changed width to full */}
      <div className="flex justify-evenly items-center w-full h-full">
        {/* Notification Panel  */}
        <button className="p-2 text-white hover:bg-white- rounded-[50%] transisiton-colors duration-200 relative" onClick={handleNotificationClick}>
          <Bell />
          <span className="absolute top-0 right-1 w-2 h-2 bg-yellow-500 rounded-[50%]"></span>
        </button>


        {/* notification */}
        {showNotification && (
          <div id='' className=""></div>
        )}
        



        {/* profile dropdown */}
        <div className="relative group flex justify-center items-center ml-2">
          <button className="hover:scale-105 duration transition-transform">
            <div
              id="User"
              className="flex items-center rounded-lg font-medium text-sm text-black justify-center mx-2 bg-gray-200 h-13 w-13 border-2 border-white"
            >
              {session?.user?.image ? (
                <img
                  src={session?.user?.image}
                  alt="Profile"
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
          </button>

          {/* DropDown Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-black backdrop-blur-lg border border-gray-300 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="p-4 border-b border-gray-300">
              <div className="font-semibold text-white">
                {session.user.name}
              </div>
              <div className="text-sm text-gray-500">
                {session.user.email}
              </div>
            </div>
            <div className="p-2">
              <Link
                href="/community"
                className="flex items-center px-3 py-2 text-gray-100 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                Profile
              </Link>
              <Link
                href="/community"
                className="flex items-center px-3 py-2 text-gray-100 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                Community
              </Link>
              <Link
                href="/help"
                className="flex items-center px-3 py-2 text-gray-100 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                Help Center
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </>
) : (
  <div className="h-full w-[18%] pr-[2%] flex items-center" id="signInUp"> {/* Keep 18% when no session */}
    <div className="h-[full] w-[50%] flex justify-center items-center">
      <div className="flex justify-evenly items-center w-full h-full">
        <button 
        className=""
        onClick={handleLogin}>Sign In</button>
      <div className=" absolute right-2 flex justify-center items-center bg-white text-black whitespace-nowrap py-6 px-8">
        GET STARTED
      </div>
      </div>
      
    </div>
  </div>
)}

        
    </nav>
  );
}
