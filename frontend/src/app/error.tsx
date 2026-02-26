"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#FF1E99]">
          Oops! Something went wrong.
        </h1>
        <p className="text-lg mb-6 text-gray-300">
          We couldn&#39;t process your request. Please try again, check your
          internet connection, or contact support if the problem persists.
        </p>
        <button
          className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] text-white shadow-lg hover:scale-105 transition-transform"
          onClick={() => reset()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
