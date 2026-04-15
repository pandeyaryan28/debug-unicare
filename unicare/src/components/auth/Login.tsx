"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to login with Google");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-10 bg-surface-container-lowest shadow-ambient rounded-[3rem] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-10">
        <h2 className="text-display-lg font-manrope font-bold text-primary tracking-tighter mb-2">
          UniCare
        </h2>
        <p className="text-label-md font-bold tracking-[0.2em] text-on-surface-variant opacity-60 uppercase">
          Health Wallet
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm font-medium animate-in shake-1 duration-300">
          {error}
        </div>
      )}

      <div className="space-y-8 text-center py-4">
        <div className="space-y-3">
          <p className="text-headline-xs md:text-headline-sm font-manrope font-bold text-on-surface">
            Welcome to your Sanctuary
          </p>
          <p className="text-body-md text-on-surface-variant font-medium leading-relaxed px-4">
            A patient-owned digital vault for all your medical records and family health history.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-4 bg-surface text-on-surface py-5 rounded-full font-bold text-title-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 border border-surface-container-high"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-manrope">{loading ? "Opening Vault..." : "Continue with Google"}</span>
        </button>

        <p className="text-[10px] md:text-label-sm text-on-surface-variant font-medium opacity-50 uppercase tracking-widest px-8">
          By continuing, you agree to our terms of clinical privacy.
        </p>
      </div>
    </div>
  );
}
