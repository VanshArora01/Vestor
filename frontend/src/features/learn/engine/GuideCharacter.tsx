import { motion, AnimatePresence } from "framer-motion";

interface GuideCharacterProps {
  state: "idle" | "thinking" | "correct" | "incorrect" | "celebrate";
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: 64,
  md: 96,
  lg: 128,
};

const variantMap = {
  idle: {
    animate: {
      y: [0, -4, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
    },
  },
  thinking: {
    animate: {
      rotate: [-10, 10, -10],
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" as const },
    },
  },
  correct: {
    animate: {
      scale: [1, 1.15, 1],
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  },
  incorrect: {
    animate: {
      x: [-6, 6, -6, 6, -6, 0],
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  },
  celebrate: {
    animate: {
      rotate: [0, 360],
      scale: [1, 1.2, 1],
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  },
};

export function GuideCharacter({ state, size = "md" }: GuideCharacterProps) {
  const px = sizes[size];
  const variant = variantMap[state];

  return (
    <div className="flex flex-col items-center gap-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          animate={variant.animate}
          className="origin-center"
          style={{ width: px, height: px }}
        >
          <svg
            viewBox="0 0 100 100"
            width={px}
            height={px}
            aria-label="Aisha the guide character"
            role="img"
          >
            {/* Triangular ears / horns */}
            <polygon points="28,38 18,10 38,30" fill="#0F766E" opacity="0.85" />
            <polygon points="72,38 82,10 62,30" fill="#0F766E" opacity="0.85" />

            {/* Circular head */}
            <circle cx="50" cy="52" r="36" fill="#0F766E" />
            {/* Lighter belly patch */}
            <ellipse cx="50" cy="60" rx="20" ry="16" fill="#CCFBF1" />

            {/* Diamond left eye */}
            <polygon points="36,46 42,40 48,46 42,52" fill="#CCFBF1" />
            <circle cx="42" cy="46" r="3" fill="#0F766E" />
            <circle cx="43.5" cy="44.5" r="1" fill="white" opacity="0.8" />

            {/* Diamond right eye */}
            <polygon points="52,46 58,40 64,46 58,52" fill="#CCFBF1" />
            <circle cx="58" cy="46" r="3" fill="#0F766E" />
            <circle cx="59.5" cy="44.5" r="1" fill="white" opacity="0.8" />

            {/* Small beak */}
            <polygon points="50,57 46,62 54,62" fill="#0D9488" />

            {/* Blush for celebrate/correct */}
            {(state === "correct" || state === "celebrate") && (
              <>
                <circle cx="30" cy="57" r="6" fill="#F43F5E" opacity="0.25" />
                <circle cx="70" cy="57" r="6" fill="#F43F5E" opacity="0.25" />
              </>
            )}
          </svg>
        </motion.div>
      </AnimatePresence>
      <span className="text-xs font-sans text-ink-500 tracking-wide">Aisha</span>
    </div>
  );
}

export function GuideCharacterWithLabel({
  state = "idle",
  size = "md",
}: GuideCharacterProps) {
  return <GuideCharacter state={state} size={size} />;
}
