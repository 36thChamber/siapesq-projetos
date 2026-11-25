import React, { useEffect } from 'react';
import Select from 'react-select';
import Circulo from '../../mapContainer/atoms/divCirculo';
import Image from "next/image";
import styles from './SelectDropdown.module.css'; // Importando os estilos CSS

interface MyAutocompleteProps {
  data: { id: string; nome: string }[];
  onChange: (selectedOption: any) => void;
  title: string;
  width?: string; // Adicionando a propriedade width ao componente
}

const SelectDropdown: React.FC<MyAutocompleteProps> = ({ data, onChange, title, width }) => {
  const options = data && data.map(item => ({
    label: item.nome,
    value: item.id,
  }));
  const nomesDePeixesParaArquivos = [
    "anchova",
    "merluza",
    "corvina",
    "sardinha",
    "atum yellowfin",
    "atum voador",
    "atum olhudo",
    "abrótea",
    "tainha",
    "pescada branca",
    "bonito listrado",
    "meka"
  ];



  const customStyles = {
    option: (base, data) => ({
      ...base,
      border: '1px solid #f0f0f0a1',
      borderRadius: '1px',
      backgroundColor: nomesDePeixesParaArquivos.includes(data.label.toLowerCase()) ? '#eed921f8' : 'white',
      color: '#093304d2'
    }),

    control: (base: any) => ({
      ...base,
      width: width || '21em', // Usando a propriedade width para definir a largura
      height: '42px',
      minHeight: 'unset',
      borderradius: '9px',
      bordercolor: 'black',
      margintop: '-0.5em',
      fontFamily: 'Poppins-Regular'
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
    }),
  };
  useEffect(() => {
    const customTooltip = document.getElementById('customTool');
    const customTooltipMessage = document.getElementById('customToolMessage');
    if (customTooltip && customTooltipMessage) {
      // Adicionar a classe 'show' quando o mouse entra no elemento .customTooltip
      const handleMouseEnter = () => {
        customTooltipMessage.style.display = 'inline';
      };

      // Remover a classe 'show' quando o mouse sai do elemento .customTooltip
      const handleMouseLeave = () => {
        customTooltipMessage.style.display = 'none';
      };

      customTooltip.addEventListener('mouseenter', handleMouseEnter);
      customTooltip.addEventListener('mouseleave', handleMouseLeave);

      // Remover os event listeners quando o componente é desmontado
      return () => {
        customTooltip.removeEventListener('mouseenter', handleMouseEnter);
        customTooltip.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []); // Executar apenas uma vez na montagem do componente


  return (
    <div style={{ marginBottom: '1em', fontFamily: 'Poppins-Regular' }}>
      <div>{title}
      </div>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'row' }}>
        <Select
          maxMenuHeight={150}
          options={options}
          onChange={onChange}
          styles={customStyles}
          placeholder="Selecione..."
        />

        {title === 'Selecione o espécie alvo' &&
          <>

            <div className={styles.customTooltip} id="customTool">
              <Circulo marginleft={'3px'} margintop={'7px'}>
                <Image src={require("../../assets/image/infoIcon.png")} alt={''} width={30} height={30}  />
              </Circulo>
            
              <div className={styles.customTooltipMessage} id="customToolMessage">As espécies em cor dourada possuem mapa de rastreamento</div>
            </div>
          </>
        }
      </div>
    </div>
  );
};

export default SelectDropdown;
