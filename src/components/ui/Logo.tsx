import logoImage from "@/assets/logo-precify.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function Logo({ 
  size = "sm", 
  showText = true, 
  className = "",
  textClassName = ""
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="PRECIFY" 
        className={`${sizeMap[size]} object-contain`}
      />
      {showText && (
        <span className={`font-logo text-xl text-foreground ${textClassName}`}>
          PRECIFY
        </span>
      )}
    </div>
  );
}
