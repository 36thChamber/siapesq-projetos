"use client";
import NextImage from "next/image";

import React, { useState } from "react";
import { CheckoutResponse } from "@/services/types/checkout.types";

interface PixPaymentBoxProps {
  pix: NonNullable<CheckoutResponse["pix"]>;
}

export default function PixPaymentBox({ pix }: PixPaymentBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPixCode = async () => {
    if (!pix.copyPaste) return;

    await navigator.clipboard.writeText(pix.copyPaste);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="border border-sky-400 bg-[#eeeeee] rounded-md p-6 text-center">
      {pix.qrCodeBase64 && (
        <NextImage unoptimized width={1024} height={768}
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          alt="QR Code Pix"
          className="w-32 h-32 mx-auto mb-4"
        />
      )}

      <p className="text-xs text-gray-600 mb-3">
        Escaneie o QR Code ou copie o código Pix abaixo para finalizar sua
        compra.
      </p>

      {pix.copyPaste && (
        <button
          type="button"
          onClick={handleCopyPixCode}
          className="w-full bg-[#0f1d40] text-white text-xs py-2 rounded-sm hover:bg-[#172554] transition-colors"
        >
          {copied ? "Código copiado!" : "Copiar Código Pix"}
        </button>
      )}
    </div>
  );
}