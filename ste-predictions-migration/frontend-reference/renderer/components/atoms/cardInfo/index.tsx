import Image from "next/image";
import React from "react";

interface CardInfoProps {
  icon_top: string;  
  style?: string;    
  text: string;      
}

const CardInfo: React.FC<CardInfoProps> = ({ icon_top, style = "", text }) => {
  return (
    <button
      className={`flex flex-col items-center justify-center rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${style}`}
    >
      <div className="flex items-center justify-center mb-2">
        <Image
          src={icon_top}
          alt="icon"
          width={40}
          height={40}
          className="object-contain"
        />
      </div>
      <p className="text-center">
        {text}
      </p>
    </button>
  );
};

export default CardInfo;
