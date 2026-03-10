import logoBlue from "@/assets/logo-precify.png";
import logoWhite from "@/assets/logo-precify-white.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
  variant?: "blue" | "white";
}

const sizeMap = {
  sm: { className: "w-8 h-8", width: 32, height: 32 },
  md: { className: "w-10 h-10", width: 40, height: 40 },
  lg: { className: "w-16 h-16", width: 64, height: 64 },
  xl: { className: "w-24 h-24", width: 96, height: 96 },
};

export function Logo({ 
  size = "sm", 
  showText = true, 
  className = "",
  textClassName = "",
  variant = "blue"
}: LogoProps) {
  const logoImage = variant === "white" ? logoWhite : logoBlue;
  const textColor = variant === "white" ? "text-white" : "text-primary";
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="PRECIFY" 
        className={`${sizeMap[size]} object-contain`}
      />
      {showText && (
        <span 
          className={`font-logo text-xl ${textColor} ${textClassName}`}
          translate="no"
        >
          PRECIFY
        </span>
      )}
    </div>
  );
}
