import { motion } from "framer-motion";

interface AnimatedGradientTextProps {
  text: string;
}

export default function AnimatedGradientText({
  text,
}: AnimatedGradientTextProps) {
  return (
    <span className="bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] bg-clip-text text-transparent animate-gradient">
      {text.split("").map((char: string, i: number) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="inline-block"
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}