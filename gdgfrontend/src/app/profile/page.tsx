"use client";

import { useEffect, useState } from "react";
import { auth } from "@/app/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Bell, 
  Info, 
  Mail, 
  Phone, 
  School,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

export default function ProfileApp() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(auth.currentUser);
  const [screen, setScreen] = useState("profile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await signOut(auth);
      router.replace("/");
    }
  };

  const getUserName = () => firebaseUser?.displayName ?? "Unknown User";
  const getUserEmail = () => firebaseUser?.email ?? "No email";
  const getPhotoUrl = () => firebaseUser?.photoURL;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans pb-24 transition-colors duration-300">
      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {screen === "profile" ? (
             <motion.div 
               key="profile"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="space-y-6"
             >
                <header className="mb-6 flex justify-between items-center">
                  <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                </header>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 p-6 shadow-2xl">
                   <div className="relative z-10">
                      <ProfileHeader 
                        light 
                        name={getUserName()} 
                        email={getUserEmail()} 
                        photoUrl={getPhotoUrl()} 
                      />
                   </div>
                   {/* Decorative circle */}
                   <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl" />
                   <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-blue-400 opacity-20 blur-2xl" />
                </div>

                <div className="space-y-3">
                  <MenuCard 
                    icon={UserIcon} 
                    title="My Account" 
                    subtitle="Edit bio-data, personal info"
                    onClick={() => setScreen("account")}
                  />
                  <MenuCard 
                    icon={Settings} 
                    title="General Settings" 
                    subtitle="Theme, language & preferences"
                    onClick={() => setScreen("settings")}
                  />
                  <MenuCard 
                    icon={Bell} 
                    title="Notifications" 
                    subtitle="Email & system updates"
                    onClick={() => setScreen("notifications")}
                  />
                  <MenuCard 
                    icon={Info} 
                    title="About App" 
                    subtitle="Version & developer info"
                    onClick={() => setScreen("about")}
                  />
                </div>

                <div className="mt-8">
                   <button 
                     onClick={handleSignOut}
                     className="w-full group flex items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-900/10 p-4 text-red-400 transition-all hover:bg-red-900/20 active:scale-95"
                   >
                     <LogOut size={18} />
                     <span className="font-semibold">Log Out</span>
                   </button>
                </div>
             </motion.div>
          ) : (
            <motion.div
              key={screen}
              {...pageVariants}
            >
               <SubPageHeader title={
                 screen === "account" ? "Bio-data" :
                 screen === "notifications" ? "Notifications" :
                 screen === "settings" ? "Settings" : "About App"
               } onBack={() => setScreen("profile")} />
               
               <div className="mt-6 space-y-4">
                 {screen === "account" && (
                     <>
                       {/* Account Content */}
                        <div className="rounded-3xl bg-card-bg p-6 border border-border-custom">
                          <div className="flex flex-col items-center mb-6">
                            <div className="relative h-24 w-24 rounded-full border-4 border-btn-bg overflow-hidden bg-btn-bg shadow-xl">
                               {getPhotoUrl() ? (
                                  <img src={getPhotoUrl()} alt="Profile" className="h-full w-full object-cover" />
                               ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-btn-hover text-3xl font-bold text-foreground">
                                    {getInitials(getUserName())}
                                  </div>
                               )}
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-foreground">{getUserName()}</h2>
                            <p className="text-secondary-text text-sm">Student</p>
                          </div>

                          <div className="space-y-4">
                            <InfoRow icon={Mail} label="Email" value={getUserEmail()} />
                            <InfoRow 
                              icon={Phone} 
                              label="Phone" 
                              editable 
                              value={mobileNumber} 
                              onChange={(val: string) => setMobileNumber(val)}
                              placeholder="Add Phone Number"
                            />
                            <InfoRow icon={School} label="College" value="RV University" />
                          </div>
                        </div>
                        <PrimaryButton label="Update Profile" />
                     </>
                 )}

                 {screen === "notifications" && (
                    <>
                      <SwitchCard 
                        title="Notifications" 
                        subtitle={notificationsEnabled ? "Allow" : "Off"} 
                        checked={notificationsEnabled}
                        onToggle={() => setNotificationsEnabled(!notificationsEnabled)} 
                      />
                      <div className="mt-4">
                        <PrimaryButton label="Save Preferences" />
                      </div>
                    </>
                 )}

                 {screen === "settings" && (
                    <>
                       <div className="rounded-3xl bg-card-bg p-1 border border-border-custom">
                         <SwitchCard 
                            title="Dark Mode" 
                            subtitle={resolvedTheme === "dark" ? "On" : "Off"} 
                            checked={resolvedTheme === "dark"}
                            onToggle={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} 
                          />
                         <div className="h-px bg-border-custom my-1 mx-4" />
                         <SettingItem label="Language" value="English" />
                       </div>
                    </>
                 )}

                 {screen === "about" && (
                    <div className="text-center space-y-6 pt-10">
                       <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                          <School size={40} className="text-white" />
                       </div>
                       <div>
                         <h3 className="text-xl font-bold text-foreground">Reclaim</h3>
                         <p className="text-secondary-text text-sm mt-2 max-w-xs mx-auto">
                           A prototype platform for reporting and recovering lost items on campus. Built For GDG TechFest
                         </p>
                       </div>
                       
                       <div className="rounded-2xl bg-card-bg p-4 border border-border-custom text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-secondary-text">Version</span>
                            <span className="font-mono text-sm text-foreground">1.0.0</span>
                          </div>
                          <div className="h-px bg-border-custom my-3" />
                          <div className="flex justify-between items-center">
                             <span className="text-secondary-text">Developer</span>
                             <span className="text-foreground">LoadBalancers</span>
                          </div>
                       </div>
                    </div>
                 )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Components

function ProfileHeader({ light, name, email, photoUrl }: any) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 ${light ? 'border-white/20' : 'border-border-custom'} ${light ? 'bg-white/10' : 'bg-card-bg'} shadow-xl`}>
         {photoUrl ? (
            <img src={photoUrl} alt="propic" className="h-full w-full object-cover" />
         ) : (
            <UserIcon size={32} className={light ? "text-white" : "text-secondary-text"} />
         )}
      </div>
      <h2 className={`text-lg font-bold ${light ? 'text-white' : 'text-foreground'}`}>{name}</h2>
      <p className={`text-sm ${light ? 'text-blue-100' : 'text-secondary-text'}`}>{email}</p>
    </div>
  )
}

function MenuCard({ icon: Icon, title, subtitle, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border-custom bg-card-bg p-4 transition-all hover:bg-btn-hover active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-btn-bg text-accent-blue transition-colors group-hover:bg-accent-blue/10 group-hover:text-accent-blue">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-xs text-secondary-text">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-secondary-text transition-transform group-hover:translate-x-1" />
    </div>
  )
}

function SubPageHeader({ title, onBack }: any) {
   return (
     <div className="flex items-center gap-4 py-2">
       <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-btn-bg text-secondary-text hover:bg-btn-hover hover:text-foreground transition-colors">
         <ChevronLeft size={20} />
       </button>
       <h1 className="text-xl font-bold text-foreground">{title}</h1>
     </div>
   )
}

function InfoRow({ icon: Icon, label, value, editable, onChange, placeholder }: any) {
   return (
     <div className="flex items-center gap-4 rounded-xl bg-btn-bg p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-secondary-text">
           <Icon size={16} />
        </div>
        <div className="flex-1 overflow-hidden">
           <p className="text-xs font-medium uppercase tracking-wider text-secondary-text">{label}</p>
           {editable ? (
             <input 
               value={value}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-secondary-text outline-none"
             />
           ) : (
             <p className="truncate text-sm font-medium text-foreground">{value}</p>
           )}
        </div>
     </div>
   )
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <button className="w-full rounded-xl bg-accent-blue py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-blue/20 transition-all hover:bg-accent-blue/80 hover:shadow-accent-blue/40 active:scale-95">
      {label}
    </button>
  )
}

function SwitchCard({ title, subtitle, checked, onToggle }: any) {
   return (
     <div 
       className="flex items-center justify-between rounded-2xl border border-border-custom bg-card-bg p-4 cursor-pointer hover:bg-btn-hover transition-colors"
       onClick={onToggle}
     >
       <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-xs text-secondary-text">{subtitle}</p>
       </div>
       <div className={`h-6 w-11 rounded-full p-1 transition-colors ${checked ? 'bg-accent-blue' : 'bg-secondary-text/30'}`}>
          <div className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
       </div>
     </div>
   )
}

function SettingItem({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-btn-hover transition-colors cursor-pointer text-foreground">
       <span className="font-medium">{label}</span>
       <div className="flex items-center gap-2 text-secondary-text">
          <span className="text-sm">{value}</span>
          <ChevronRight size={16} />
       </div>
    </div>
  )
}
