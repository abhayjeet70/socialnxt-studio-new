import { useState } from "react";

export const PaymentAppBadge = ({
  label,
  logo,
  height = 24,
}: {
  label: string;
  logo: string;
  height?: number;
}) => {
  const [useText, setUseText] = useState(false);

  if (useText) {
    return (
      <span className="text-[8px] font-semibold px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600 shrink-0">
        {label}
      </span>
    );
  }

  return (
    <img
      src={logo}
      alt={label}
      className="block shrink-0"
      style={{ height, width: "auto", objectFit: "contain" }}
      onError={() => setUseText(true)}
    />
  );
};
