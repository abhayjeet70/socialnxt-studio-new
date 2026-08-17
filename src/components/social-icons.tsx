import React from "react";

export function InstagramLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad1" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad1)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export function FacebookLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 00-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 014-4h2v3z" fill="white"/>
    </svg>
  );
}

export function LinkedInLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0A66C2"/>
      <rect x="4" y="9" width="3" height="11" fill="white"/>
      <circle cx="5.5" cy="5.5" r="1.8" fill="white"/>
      <path d="M9.5 9h2.8v1.5C12.8 9.6 14 9 15.3 9c2.5 0 3.7 1.7 3.7 4.5V20h-3v-5.8c0-1.3-.3-2.2-1.5-2.2s-2 .9-2 2.3V20h-3V9z" fill="white"/>
    </svg>
  );
}

export function YouTubeLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FF0000"/>
      <path d="M20.9 7.5s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.5 4.5 12 4.5 12 4.5s-3.5 0-6 .1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S3 9.1 3 10.7v1.5c0 1.6.1 3.2.1 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9C7.7 18.5 12 18.5 12 18.5s3.5 0 6-.1c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2S21 14.9 21 13.3v-1.5c0-1.6-.1-3.3-.1-3.3z" fill="#FF0000"/>
      <path d="M10.5 15V9l5.5 3-5.5 3z" fill="white"/>
    </svg>
  );
}

export function TikTokLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#010101"/>
      <path d="M17 6.7c-.9-.6-1.5-1.5-1.7-2.7H13v10.3c0 1.2-.9 2.2-2.1 2.2a2.1 2.1 0 01-2.1-2.1c0-1.2.9-2.1 2.1-2.1.2 0 .4 0 .6.1V10a5 5 0 00-.6 0 4.8 4.8 0 000 9.5 4.8 4.8 0 004.9-4.8V9.3c.8.5 1.8.8 2.8.8V7.4A3.5 3.5 0 0117 6.7z" fill="white"/>
      <path d="M17 6.7c-.9-.6-1.5-1.5-1.7-2.7H13v10.3c0 1.2-.9 2.2-2.1 2.2a2.1 2.1 0 01-2.1-2.1c0-1.2.9-2.1 2.1-2.1.2 0 .4 0 .6.1V10a5 5 0 00-.6 0 4.8 4.8 0 000 9.5 4.8 4.8 0 004.9-4.8V9.3c.8.5 1.8.8 2.8.8V7.4A3.5 3.5 0 0117 6.7z" fill="#69C9D0" opacity="0.5"/>
    </svg>
  );
}

export function TwitterLogo({ className, width = 28, height = 28 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#000000"/>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
    </svg>
  );
}
