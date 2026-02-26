"use client";
import { TypeAnimation } from "react-type-animation";

export default function AnimatedWordType() {
  return (
    <span className="bg-gradient-to-r from-[#C6A75E] via-[#E8D5A3] to-[#C6A75E] bg-clip-text text-transparent animate-gradient text-2xl md:text-7xl" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300,letterSpacing:'0.03em'}}>
      JUST -{" "}
      <TypeAnimation
        sequence={["WORDS.", 1500, "VOICE.", 1500]}
        wrapper="span"
        speed={50}
        style={{ display: "inline-block" }}
        repeat={Infinity}
        aria-live="polite"
      />
      <noscript>
        <span className="text-white">WORDS &amp; VOICE.</span>
      </noscript>
    </span>
  );
}
