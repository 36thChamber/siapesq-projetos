import React from 'react';
import Select from 'react-select';

interface MyAutocompleteProps {
  data: { id: string; nome: string }[];
  onChange: (selectedOption: any) => void;
  title?: string;
  width?: string;
  height?: string;
  borderColor?: string;
  borderRadius?: string;
  maxHeight?: string;
  marginLeft?: string;
  marginTop?: string;
  border?: string;
  overFlowY?: string;
  disabled?: boolean;
}

const SelectDropdown: React.FC<MyAutocompleteProps> = ({ data, onChange, width, height,maxHeight, marginLeft, marginTop, border, borderColor, borderRadius, disabled  }) => {
  const options = data && data.map(item => ({
    label: item.nome,
    value: item.id,
  }));

  const customStyles = {
    control: (base: any) => ({
      ...base,
      width: width || '13em',
      height: height||  '40px',
      minHeight: 'unset',
      fontFamily: 'Poppins-Regular',
      alignItems: 'center',
      marginLeft: marginLeft || 'auto',
      marginRight: 'auto',
      marginTop: marginTop,
      border: border || '0px',
      borderRadius: borderRadius || '0px',
      borderColor: borderColor || '#fff',
      disabled: disabled,
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
      border: '0px'
    }),
    menuPortal: (base: any) => ({ ...base, textAlign: 'center', zIndex: 9999 }),
    menu: (base: any) => ({
      ...base,
      maxHeight: maxHeight ? maxHeight : '100px',
      maxWidth: '18em'
    }),
  };
  const menuPortalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
      <Select
        maxMenuHeight={100} 
        options={options}
        onChange={onChange}
        styles={customStyles}
        placeholder="Selecione ..."
        menuPortalTarget={menuPortalTarget}
        isDisabled={disabled}
      />
    
  );
};

export default SelectDropdown;
