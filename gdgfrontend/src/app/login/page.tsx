"use client";

import { useEffect } from "react";
import { Github } from "lucide-react";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { auth } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";

const backgroundImage = "/images/loginpagebg.png";

export default function LoginPage() {
  const router = useRouter(); // ✅ REQUIRED for navigation

  // ✅ Initialize Google Auth ONCE
  useEffect(() => {
    GoogleAuth.initialize({
      clientId:
        "680513043824-fh4qbj63teuee525chfqk5bpcfhmgm6v.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
  }, []);

  // ✅ Google Sign-In (Capacitor-safe)
  const handleGoogleSignIn = async () => {
    try {
      const googleUser = await GoogleAuth.signIn();

      if (!googleUser?.authentication?.idToken) {
        throw new Error("No ID token returned from Google");
      }

      const credential = GoogleAuthProvider.credential(
        googleUser.authentication.idToken
      );

      await signInWithCredential(auth, credential);

      // ✅ IMPORTANT: Manual navigation (DO NOT rely on AuthGate)
      router.replace("/selector");
    } catch (err) {
      console.error("Google Sign-In failed:", err);
      alert("Google Sign-In failed. Check Logcat for details.");
    }
  };

  const handleGithubSignIn = () => {
    router.push("/selector")
  };

  return (
    <div className="bg-[#000000] min-h-screen overflow-y-auto">
      <div className="relative h-screen flex flex-col">
        {/* Background Image */}
        <div className="absolute inset-0 h-[70vh] top-0">
          <img
            src={backgroundImage}
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="relative h-[50vh] bg-gradient-to-b from-transparent to-[#0F172A] to-[30%] flex flex-col justify-end pb-20 px-6">
            <div className="text-center space-y-8">
              {/* Title */}
              <div className="space-y-3">
                <h1 className="font-[family-name:var(--font-jersey-10)] text-[56px] text-white">
                  Welcome Back
                </h1>
                <p className="font-[family-name:var(--font-jersey-10)] text-[18px] text-[#a2a2a2] max-w-sm mx-auto">
                  Sign in to continue helping your community
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3 max-w-sm mx-auto">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] transition-all rounded-[16px] px-6 py-4 flex items-center justify-center gap-3 shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-gray-800 text-[20px] font-[family-name:var(--font-jersey-10)]">
                    Continue with Google
                  </span>
                </button>

                <button
                  onClick={handleGithubSignIn}
                  className="w-full bg-[#24292e] hover:bg-[#2f363d] active:scale-[0.98] transition-all rounded-[16px] px-6 py-4 flex items-center justify-center gap-3 shadow-lg"
                >
                  <Github className="w-5 h-5 text-white" />
                  <span className="text-white text-[20px] font-[family-name:var(--font-jersey-10)]">
                    Continue with GitHub
                  </span>
                </button>
              </div>

              <p className="text-[14px] text-[#6b7280] max-w-xs mx-auto font-[family-name:var(--font-jersey-10)]">
                By continuing, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
