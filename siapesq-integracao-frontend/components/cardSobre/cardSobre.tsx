import Image from "next/image";

type cardSobreProps = {
  icon?: string;
  title?: string;
  description?: Array<string>;
  iconPosiotion?: string;
  descriptionPosition?: string;
  theme?: string;
  textColor?: string;
  iconW?: number;
  iconH?: number;
};

export default function CardSobre({
  icon,
  title,
  description,
  iconH,
  iconW,
  theme,
  textColor,
}: cardSobreProps) {
  return (
    <div
      className={`bg-white rounded-xl p-5 flex flex-col gap-y-2 w-full`}
    >
      <div className="flex gap-x-5 items-center">
        {icon && (
          <Image
            src={icon}
            alt="icon"
            width={iconW || 50}
            height={iconH || 50}
          />
        )}
        <h1 className="text-center font-semibold text-xl">{title}</h1>
      </div>
      <ul className="w-full">
        {description?.map((text) => (
          <li key={text} className="list-none">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardSocial({
  icon,
  title,
  description,
  iconH,
  iconW,
  theme = "white",
  textColor,
}: cardSobreProps) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-y-2 w-full ${
        textColor ? `text-${textColor}` : "text-gray-700"
      }`}
      style={{ backgroundColor: theme === "white" ? "#ffffff" : "#d8dce9" }}
    >
      <div className="flex gap-x-5 items-center">
        {icon && (
          <Image
            src={icon}
            alt="icon"
            width={iconW || 50}
            height={iconH || 50}
          />
        )}
        <h1 className="text-center font-semibold text-xl">{title}</h1>
      </div>
      <ul className="w-full">
        {description?.map((text) => (
          <li key={text} className="list-none">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
