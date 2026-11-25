type ButtonProps = {
  placeholder: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function Button({ placeholder, onClick, disabled }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="bg-gradient-to-r from-primary-blue-light via-primary-blue to-primary-grenn w-[50%] text-white px-6 py-2 rounded-lg shadow-lg disabled:bg-gray-400"
    >
      {placeholder}
    </button>
  );
}
