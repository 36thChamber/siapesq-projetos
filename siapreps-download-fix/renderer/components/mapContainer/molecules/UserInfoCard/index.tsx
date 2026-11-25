import { useState } from "react";
import CompressIcon from "../../../../resources/icons/common/CompresIcon";
import ExpandIcon from "../../../../resources/icons/common/ExpandIcon";

interface IUserInfoCard {
  speed: number;
  stateGps: string;
  direction: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const UserInfoCard = ({
  speed,
  stateGps,
  coordinates,
  direction,
  onMouseEnter,
  onMouseLeave,
}: IUserInfoCard) => {
  const [isOpen, setIsOpen] = useState(true);

  const info = [
    {
      key: "speed",
      title: "Velocidade",
      value: speed ? `${speed} Nós` : "0 Nós",
    },
    {
      key: "stateGps",
      title: "GPS",
      value: stateGps ? stateGps : "Conectando...",
    },
  ];

  if (direction) {
    info.push({
      key: "direction",
      title: "Direção",
      value: direction,
    });
  } else {
    info.filter((item) => item.key !== "direction");
  }

  return (
    <div
      style={{
        width: "fit-content",
        zIndex: 1000,
        position: "absolute",
        bottom: "25px",
        right: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-center",
        justifyContent: "center",
        backgroundColor: "rgba(20,26,34,0.75)",
        borderRadius: "10px",
        padding: "10px",
        fontSize: "16px",
        color: "white",
        textShadow: "2px 2px 2px rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        transition: "all 0.3s ease-in-out",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "15px",
          }}
        >
          Informações de navegação
        </p>
        {!isOpen ? (
          <>
            <ExpandIcon onClick={() => setIsOpen(true)} />
          </>
        ) : (
          <div
            style={{
              width: "fit-content",
              marginLeft: "auto",
              height: "fit-content",
            }}
          >
            <CompressIcon onClick={() => setIsOpen(false)} />
          </div>
        )}
      </div>

      <div
        style={{
          maxHeight: isOpen ? "300px" : "0px",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0px)" : "translateY(-10px)",
          transition: "all 0.4s ease",
          overflow: "hidden",
          marginTop: isOpen ? "10px" : "0",
          width: "100%",
        }}
      >
        {coordinates && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "0.5em",
            }}
          >
            <p style={{ margin: "0", fontSize: "16px" }}>
              Latitude: {coordinates.latitude?.toFixed(4)}
            </p>
            <p style={{ margin: "0", fontSize: "16px" }}>
              Longitude: {coordinates.longitude?.toFixed(4)}
            </p>
          </div>
        )}

        {info.map(({ key, title, value }) => (
          <div
            key={key}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginBottom: "0.5em",
            }}
          >
            <div style={{ width: "fit-content", marginRight: "0.5em" }}>
              {title}:
            </div>
            <div style={{ width: "fit-content" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserInfoCard;
