"use client";
import React, { useState } from "react";
import {
  User, Settings, Bell, Shield, Key, Keyboard, Users, Folder, Zap, Globe, 
  Mail, Phone, Calendar, MapPin, Edit2, Save, X, LogOut, ChevronRight, 
  Check, Lock, Smartphone, Monitor, Moon, Sun, Trash2, Eye, EyeOff, 
  Download, LayoutGrid, Tag, FileText, Target, Puzzle, ChevronDown, CheckCircle
} from "lucide-react";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("Profile");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "Samuel Wilson",
    displayName: "s_wilson_168920",
    email: "wilson@example.com",
    phone: "(213) 555-1234",
    address: "California, United States",
    birthDate: "January 1, 1987",
    gender: "Male",
    nationality: "American",
    language: "English",
    timezone: "GMT-5 (Eastern Time)",
    darkMode: true,
    emailNotifications: true,
    smsNotifications: false,
    twoFactorEnabled: true,
  });

  const menuGroups = [
    {
      label: "Settings",
      items: [
        { name: "Workspace", icon: <LayoutGrid size={16} /> },
        { name: "Overview", icon: <Eye size={16} /> },
        { name: "Members", icon: <Users size={16} /> },
        { name: "Label", icon: <Tag size={16} /> },
        { name: "Projects", icon: <Folder size={16} /> },
        { name: "Templates", icon: <FileText size={16} /> },
        { name: "Initiatives", icon: <Target size={16} /> },
        { name: "Integrations", icon: <Puzzle size={16} /> },
      ],
    },
    {
      label: "My Account",
      items: [
        { name: "Profile", icon: <User size={16} /> },
        { name: "Notifications", icon: <Bell size={16} /> },
        { name: "Security & Access", icon: <Shield size={16} /> },
        { name: "API Keys", icon: <Key size={16} /> },
        { name: "Keyboard Shortcuts", icon: <Keyboard size={16} /> },
      ],
    },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0b0d0e] text-[#9ca3af] font-sans flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0c0e] border-r border-white/5 p-4 flex flex-col hidden lg:flex">

        <nav className="space-y-6 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-3 flex justify-between items-center">
                {group.label} {group.label === "My Account" && <ChevronDown size={12} />}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setActiveSection(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[13px] ${
                      activeSection === item.name 
                        ? "bg-white/5 text-white" 
                        : "hover:bg-white/[0.02] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className="w-full flex items-center gap-3 px-3 py-2 mt-4 text-[13px] text-gray-500 hover:text-red-400 transition-colors">
            <LogOut size={16} /> Log Out
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-y-auto bg-[#0b0d0e]">
        {/* Checkered Background Pattern */}
        <div className="absolute top-0 inset-x-0 h-80 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-5xl mx-auto p-6 lg:p-10 relative z-10">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] mb-10">
            <span className="opacity-40">My Account</span>
            <span className="opacity-20">/</span>
            <div className="flex items-center gap-1.5 text-gray-200">
              <User size={14} className="opacity-60" /> {activeSection}
            </div>
          </div>

          {activeSection === "Profile" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Profile Hero */}
              <div className="flex flex-col items-center mb-12">
                <div className="relative mb-4 group">
                  <img src="https://i.pravatar.cc/150?img=32" className="w-24 h-24 rounded-full border-4 border-white/5 object-cover" alt="User" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Edit2 size={16} className="text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                  {formData.fullName} <CheckCircle size={18} className="text-blue-500 fill-blue-500/10" />
                </h1>
                <p className="text-sm text-gray-500">{formData.email}</p>
              </div>

              {/* Grid System */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* 1. Personal Details */}
                <Card 
                  title="Personal details" 
                  action={
                    <button onClick={() => setIsEditing(!isEditing)} className="text-gray-500 hover:text-white transition">
                      {isEditing ? <Save size={14} className="text-blue-400" /> : <Edit2 size={14} />}
                    </button>
                  }
                >
                  <DataRow label="Full name:" value={formData.fullName} name="fullName" isEditing={isEditing} onChange={handleInputChange} />
                  <DataRow label="Date of Birth:" value={formData.birthDate} name="birthDate" isEditing={isEditing} onChange={handleInputChange} />
                  <DataRow label="Gender:" value={formData.gender} name="gender" isEditing={isEditing} onChange={handleInputChange} />
                  <DataRow label="Nationality:" value={formData.nationality} name="nationality" isEditing={isEditing} onChange={handleInputChange} />
                  <DataRow label="Address:" value={formData.address} name="address" isEditing={isEditing} onChange={handleInputChange} icon="🇺🇸" />
                  <DataRow label="Phone Number:" value={formData.phone} name="phone" isEditing={isEditing} onChange={handleInputChange} />
                  <DataRow label="Email:" value={formData.email} name="email" isEditing={isEditing} onChange={handleInputChange} />
                </Card>

                {/* 2. Account Details */}
                <Card title="Account Details">
                  <DataRow label="Display Name:" value={formData.displayName} />
                  <DataRow label="Account Created:" value="March 20, 2020" />
                  <DataRow label="Last Login:" value="August 22, 2024" />
                  <DataRow label="Membership Status:" value="Premium Member" />
                  <DataRow label="Account Verification:" value={<span className="text-green-500/80">Verified</span>} />
                  <DataRow label="Language Preference:" value={formData.language} />
                  <DataRow label="Time Zone:" value={formData.timezone} />
                </Card>

                {/* 3. Security Settings */}
                <Card title="Security Settings">
                  <DataRow label="Two-Factor Auth:" value={<Badge text={formData.twoFactorEnabled ? "Enabled" : "Disabled"} color="blue" />} />
                  <DataRow label="Login Notifications:" value={<Badge text="Enabled" color="blue" />} />
                  <DataRow label="Connected Devices:" value="3 Devices" />
                  <DataRow label="Account Status:" value="No Issues Detected" />
                </Card>

                {/* 4. Preferences */}
                <Card title="Preferences">
                  <DataRow label="Email Notifications:" value={<Badge text="Subscribed" color="purple" />} />
                  <DataRow label="SMS Alerts:" value={<Badge text="Enabled" color="blue" />} />
                  <DataRow label="Dark Mode:" value={formData.darkMode ? "Activated" : "Deactivated"} />
                  <DataRow label="Content Language:" value="English" />
                </Card>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 animate-in fade-in duration-300">
               <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10 text-white">
                  <Settings size={32} />
               </div>
               <h2 className="text-xl font-medium text-white mb-2">{activeSection} Page</h2>
               <p className="text-sm opacity-50">Manage your {activeSection.toLowerCase()} settings here.</p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}

/* --- HELPER COMPONENTS (STRIKING DESIGN) --- */

const Card = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-[#111315]/50 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md">
    <div className="bg-white/[0.02] px-4 py-3 border-b border-white/5 flex justify-between items-center">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</h3>
      {action}
    </div>
    <div className="p-0 divide-y divide-white/[0.03]">
      {children}
    </div>
  </div>
);

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  isEditing?: boolean;
  name?: string;
  onChange?: (field: string, value: string | boolean) => void;
  icon?: string;
}

const DataRow = ({ label, value, isEditing, name, onChange, icon }: DataRowProps) => (
  <div className="flex items-center justify-between px-4 py-3 text-[12px] group hover:bg-white/[0.01] transition-colors">
    <span className="text-gray-500 w-1/3">{label}</span>
    <div className="w-2/3 text-right">
      {isEditing && name ? (
        <input 
          type="text" 
          name={name} 
          value={value as string} 
          onChange={(e) => onChange?.(name, e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white w-full text-right outline-none focus:border-blue-500/50 transition"
        />
      ) : (
        <span className="text-gray-200 flex items-center justify-end gap-2">
          {icon && <span>{icon}</span>}
          {value}
        </span>
      )}
    </div>
  </div>
);

const Badge = ({ text, color }: { text: string; color: "blue" | "purple" }) => {
  const styles = {
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${styles[color]}`}>
      {text}
    </span>
  );
};