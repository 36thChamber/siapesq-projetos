import { useState } from "react";
import GalleryModal from "../galleryModal";

export type ImageItem = {
  id: string | number;
  url: string;
  alt?: string;
};

export type ImageGalleryProps = {
  images: any[]; 
  galleryImages: ImageItem[]; 
};

export default function CardImages({
  images,
  galleryImages,
}: ImageGalleryProps) {
  const [open, setOpen] = useState(false);

  
  const mainImage = images[0] || null;
  
  const thumbnails = images.slice(1, 3); 

  return (
    <div className="w-full">
      {/* Imagem Principal */}
      <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
        {mainImage && (
          <img
            src={mainImage.url}
            alt={mainImage.alt || "principal"}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* Thumbnails */}
       <div className="mt-2 grid grid-cols-3 gap-2">
        {thumbnails.map((thumb) => (
          <div
            key={thumb.id}
            className="aspect-[4/3] rounded-md overflow-hidden bg-gray-200"
          >
            <img
              src={thumb.url}
              alt={thumb.alt || "thumb"}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {thumbnails.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="relative aspect-[4/3] rounded-md overflow-hidden"
          >
            <img
              src={thumbnails[0].url}
              className="w-full h-full object-cover blur-[2px] opacity-50"
            />

            <img
              className="absolute inset-0 m-auto text-white"
              src="../images/icons/moreImages.svg"
              alt="icone de +"
            />
          </button>
        )}
      </div>

      {/* Modal */}
      <GalleryModal
        open={open}
        images={galleryImages}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}