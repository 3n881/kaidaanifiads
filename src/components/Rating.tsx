import { Star } from "lucide-react";

export default function Rating({
  value = 4.8,
  showValue = true,
  className = "",
}: {
  value?: number;
  showValue?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="flex text-gold-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="h-3.5 w-3.5"
            fill={i < Math.round(value) ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-sm font-semibold text-brand-700">{value}/5</span>
      )}
    </span>
  );
}
