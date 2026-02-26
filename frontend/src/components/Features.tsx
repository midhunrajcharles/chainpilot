import React from "react";
import { Meteors } from "@/components/ui/meteors";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="relative w-full max-w-xs mx-auto group">
    <div className="absolute inset-0 h-full w-full scale-[0.80] transform rounded-full bg-gradient-to-r from-slate-600/20 via-white/10 to-slate-400/20 blur-3xl group-hover:scale-[0.85] transition-transform duration-300" />
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-8 shadow-2xl hover:border-white/30 hover:bg-white/10 transition-all duration-300">
      <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 text-white">
        {icon}
      </span>
      <h3 className="relative z-50 mb-3 text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="relative z-50 text-sm font-normal text-slate-300 text-center leading-relaxed">
        {description}
      </p>
      <Meteors number={8} />
    </div>
  </div>
);

const Features = ({ features }: { features: FeatureCardProps[] }) => (
  <section className="w-full max-w-6xl mx-auto mb-24">
    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent text-center mb-10">
      Powerful Features
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
      {features.map((feature, idx) => (
        <FeatureCard key={idx} {...feature} />
      ))}
    </div>
  </section>
);

export default Features;
