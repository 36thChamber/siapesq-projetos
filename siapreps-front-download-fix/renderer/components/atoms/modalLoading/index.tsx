"use client";

type ModalLoadingProps = {
  message?: string;
};

export default function ModalLoading({
  message = "Carregando Análises...",
}: ModalLoadingProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className="
          bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-sm
          flex flex-col items-center gap-4
          animate-[modalIn_0.2s_ease-out]
        "
      >
        <div className="w-10 h-10 rounded-full border-4 border-dark_green-500 border-t-transparent animate-spin" />

        <p className="text-dark_green-700 text-center font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
