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

export default function ProfileApp() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<any>(auth.currentUser);
  const [screen, setScreen] = useState("profile");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await signOut(auth);
      router.replace("/");
    }
  };

  const getUserName = () => firebaseUser?.displayName ?? "Guest User";
  const getUserEmail = () => firebaseUser?.email ?? "No email";
  const getPhotoUrl = () => firebaseUser?.photoURL;

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2 }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 font-sans pb-24">
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
                        <div className="rounded-3xl bg-neutral-900 p-6 border border-neutral-800">
                          <div className="flex flex-col items-center mb-6">
                            <div className="relative h-24 w-24 rounded-full border-4 border-neutral-800 overflow-hidden bg-neutral-800 shadow-xl">
                               {getPhotoUrl() ? (
                                  <img src={getPhotoUrl()} alt="Profile" className="h-full w-full object-cover" />
                               ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-neutral-700 text-3xl font-bold text-white">
                                    {getUserName()?.charAt(0).toUpperCase()}
                                  </div>
                               )}
                            </div>
                            <h2 className="mt-4 text-xl font-bold">{getUserName()}</h2>
                            <p className="text-neutral-400 text-sm">Student</p>
                          </div>

                          <div className="space-y-4">
                            <InfoRow icon={Mail} label="Email" value={getUserEmail()} />
                            <InfoRow 
                              icon={Phone} 
                              label="Phone" 
                              editable 
                              value={phone} 
                              onChange={(val: string) => setPhone(val)}
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
                      <SwitchCard title="Email Notifications" subtitle="Receive updates via email" checked />
                      <SwitchCard title="Push Notifications" subtitle="Receive updates on your device" checked={false} />
                      <div className="mt-4">
                        <PrimaryButton label="Save Preferences" />
                      </div>
                    </>
                 )}

                 {screen === "settings" && (
                    <>
                       <div className="rounded-3xl bg-neutral-900 p-1 border border-neutral-800">
                         <SettingItem label="Theme" value="Dark Mode" />
                         <div className="h-px bg-neutral-800 my-1 mx-4" />
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
                         <h3 className="text-xl font-bold">RVU Lost & Found</h3>
                         <p className="text-neutral-400 text-sm mt-2 max-w-xs mx-auto">
                           The official platform for reporting and recovering lost items on campus.
                         </p>
                       </div>
                       
                       <div className="rounded-2xl bg-neutral-900 p-4 border border-neutral-800 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-400">Version</span>
                            <span className="font-mono text-sm">1.0.0</span>
                          </div>
                          <div className="h-px bg-neutral-800 my-3" />
                          <div className="flex justify-between items-center">
                             <span className="text-neutral-400">Developer</span>
                             <span>LoadBalancers</span>
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
      <div className={`mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 ${light ? 'border-white/20' : 'border-neutral-800'} bg-neutral-800 shadow-xl`}>
         {photoUrl ? (
            <img src={photoUrl} alt="propic" className="h-full w-full object-cover" />
         ) : (
            <UserIcon size={32} className={light ? "text-white" : "text-neutral-400"} />
         )}
      </div>
      <h2 className={`text-lg font-bold ${light ? 'text-white' : 'text-neutral-100'}`}>{name}</h2>
      <p className={`text-sm ${light ? 'text-blue-100' : 'text-neutral-500'}`}>{email}</p>
    </div>
  )
}

function MenuCard({ icon: Icon, title, subtitle, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:bg-neutral-800 hover:border-neutral-700 active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-blue-400 transition-colors group-hover:bg-blue-500/10 group-hover:text-blue-400">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-neutral-200">{title}</h3>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-neutral-600 transition-transform group-hover:translate-x-1" />
    </div>
  )
}

function SubPageHeader({ title, onBack }: any) {
   return (
     <div className="flex items-center gap-4 py-2">
       <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors">
         <ChevronLeft size={20} />
       </button>
       <h1 className="text-xl font-bold">{title}</h1>
     </div>
   )
}

function InfoRow({ icon: Icon, label, value, editable, onChange, placeholder }: any) {
   return (
     <div className="flex items-center gap-4 rounded-xl bg-neutral-800/50 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
           <Icon size={16} />
        </div>
        <div className="flex-1 overflow-hidden">
           <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
           {editable ? (
             <input 
               value={value}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-transparent text-sm font-medium text-white placeholder-neutral-600 outline-none"
             />
           ) : (
             <p className="truncate text-sm font-medium text-white">{value}</p>
           )}
        </div>
     </div>
   )
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <button className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:shadow-blue-900/40 active:scale-95">
      {label}
    </button>
  )
}

function SwitchCard({ title, subtitle, checked }: any) {
   return (
     <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
       <div>
          <h3 className="font-medium text-neutral-200">{title}</h3>
          <p className="text-xs text-neutral-500">{subtitle}</p>
       </div>
       <div className={`h-6 w-11 rounded-full p-1 transition-colors ${checked ? 'bg-blue-600' : 'bg-neutral-700'}`}>
          <div className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
       </div>
     </div>
   )
}

function SettingItem({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-neutral-800/50 transition-colors cursor-pointer">
       <span className="font-medium text-neutral-200">{label}</span>
       <div className="flex items-center gap-2 text-neutral-400">
          <span className="text-sm">{value}</span>
          <ChevronRight size={16} />
       </div>
    </div>
  )
}
