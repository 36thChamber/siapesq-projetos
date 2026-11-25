import Carousel from "../carousel";

export type ImageItem = {
  id: string | number;
  url: string;
  alt?: string;
};

type GalleryModalProps = {
  open: boolean;
  images: ImageItem[];
  onClose: () => void;
};

export default function GalleryModal({
  open,
  images,
  onClose,
}: GalleryModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl h-[80vh] p-4  rounded-lg backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-4 py-1 z-20"
        >
          <img
            className="absolute inset-0 m-auto"
            src="../images/icons/xClosed.svg"
            alt="icone de fechar"
          />
        </button>

        {/* Carrossel */}
        <Carousel images={images} />
      </div>
    </div>
  );
}
