import SelectDropdown from "../../atoms/selectDropdown";
import H2 from "../../atoms/h2";
import Div from "../../atoms/div";
import Circulo from "../../atoms/divCirculo";
import Image from "next/image";
import { useEffect, useState } from "react";
import { get_principal_pngs_names } from "../../../../controllers/pngsMapas";

type Props = {
  especieMapa: string;
  onClick: () => void;
  especies: any[];
  onChange: (selectedOption: any) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function MenuEspeciesMapas(props: Props) {
  const [especies, setEspecies] = useState<
    { name: string, label: string; value: number }[]
  >([]);
  const [especieMapa, setEspecieMapa] = useState("");

  useEffect(() => {
    const carregarEspecies = async () => {
      const dados = await get_principal_pngs_names();
      setEspecies(dados);
    };
    carregarEspecies();
  }, []);
  return (
    <>
      <Div
        width={"310px"}
        height={"200px"}
        borderradius={"10px"}
        top={"15px"}
        left={"225px"}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        <H2
          fontSize={"13px"}
          text={`Mapa da espécie: ${props.especieMapa}`}
          left={"4%"}
          top={"15px"}
        />
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginLeft: "20em",
            marginTop: "-0.5em",
          }}
          onClick={() => {
            props.onClick();
          }}
        >
          <Circulo>
            <Image
              src={require("../../../assets/image/confirmar.png")}
              alt={""}
            />
          </Circulo>
        </button>
        <SelectDropdown
          data={props.especies}
          onChange={props.onChange}
          title={""}
          width="290px"
          borderRadius="9px"
        ></SelectDropdown>
      </Div>
    </>
  );
}

export default MenuEspeciesMapas;
