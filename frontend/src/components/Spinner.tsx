// src/components/Spinner.tsx
import React from "react";

export function Spinner({ className = "" }: { className?: string }) {
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div className="spinner-loader" />
            <style jsx>{`
        .spinner-loader {
          border: 6px solid #e5e7eb;
          border-top: 6px solid #6366f1;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
