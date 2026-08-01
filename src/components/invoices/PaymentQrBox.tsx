import { useRef } from "react";
import { Upload } from "lucide-react";

interface PaymentQrBoxProps {
  src: string;
  editable?: boolean;
  onUpload?: (file: File) => void;
  className?: string;
}

export const PaymentQrBox = ({
  src,
  editable,
  onUpload,
  className = "w-[100px] h-[100px]",
}: PaymentQrBoxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className={`relative shrink-0 border border-gray-200 p-1 bg-white group ${className}`}>
      <img
        src={src}
        alt="Payment QR"
        className="w-full h-full object-contain"
        onError={e => { e.currentTarget.src = "/payment-qr.png"; }}
      />
      {editable && onUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload QR
          </button>
        </>
      )}
    </div>
  );
};
