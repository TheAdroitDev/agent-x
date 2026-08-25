"use client";

import { signIn } from "@/features/auth/lib/auth-client";
import { useState } from "react";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleTwitterSignIn = async () => {
        try {
            setIsLoading(true);
            await signIn.social({
                provider: "twitter",
                callbackURL: "/dashboard",
            });
        } catch (error) {
            console.error("Sign in failed:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="mb-2 text-3xl font-bold text-white">
                        Welcome to AgentX
                    </h1>
                    <p className="text-gray-400">
                        Sign in to manage your X growth
                    </p>
                </div>

                <button
                    onClick={handleTwitterSignIn}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg bg-black px-4 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                >
                    <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>
                        {isLoading ? "Connecting..." : "Sign in with X"}
                    </span>
                </button>
            </div>
        </div>
    );
}
