const MAX_QR_BYTES = 2 * 1024 * 1024;

export const readPaymentQrFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload an image file (PNG, JPG, or WebP)."));
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      reject(new Error("QR image must be under 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
