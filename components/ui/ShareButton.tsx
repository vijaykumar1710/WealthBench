"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
  variant?: "default" | "outline";
}

export default function ShareButton({ 
  title, 
  text, 
  url, 
  className = "", 
  variant = "default" 
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const isWebShareAvailable =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShare = async () => {
    setLoading(true);

    try {
      // Check if Web Share API is available (mobile devices)
      if (isWebShareAvailable) {
        const shareData = {
          title,
          text,
          url: shareUrl,
        };

        if (
          typeof navigator.canShare !== "function" ||
          navigator.canShare(shareData)
        ) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
      // Still try clipboard as fallback
      try {
        await navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    } finally {
      setLoading(false);
    }
  };

  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = variant === "outline" 
    ? "border border-gray-300 hover:bg-gray-50 text-gray-700"
    : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`${baseClasses} ${variantClasses} ${className}`}
      aria-label="Share this page"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Sharing...
        </>
      ) : copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          {isWebShareAvailable ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          Share
        </>
      )}
    </button>
  );
}
