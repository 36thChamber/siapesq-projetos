import React, { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';
import SelectDropdown from '../../mapContainer/atoms/selectDropdown';

type TableStyleProps = {
  width?: string | number,
  margintop?: string | number,
  marginleft?: string | number,
  border?: string | number
};

const TableStyle = styled.table<TableStyleProps>`
    font-family: "Poppins-Bold";
    font-size: 13px;
    border-collapse: collapse;
    table-layout: auto;
    border: ${props => props.border};
    width: ${props => props.width};
    margin-top: ${props => props.margintop};
    text-align: center;
    color: #333333;
    margin-left: auto;     
    margin-right: auto; 

    thead tr th {
        background-color: #CCF5FE;
    }

    tr {
        font-size: 11px;
    }
    
    tr th{
        padding: 10px;
    }

    tr td{
        background-color: #ffffff;
        padding: 0px;
    }

    input{
        border: none;
        padding: 0;
        max-width: 95px;
        text-align: center;
        outline: none;
    }

    p {
      opacity: 0.8;
      padding: 0;
      margin: 10px;
    }
`;

type TableProps = {
  columns: number,
  headers: string[],
  data: String[][],
  isca: { id: string; nome: string; }[],
  fundo: { id: string; nome: string; }[],
  width?: string | number,
  margintop?: string | number,
  marginleft?: string | number,
  marginRight?: string | number,
  border?: string | number,
  children?: ReactNode
};

function TableDate(props: TableProps) {
  const [editableData, setEditableData] = useState<String[][]>(props.data);

  useEffect(() => {
    setEditableData(props.data);
  }, [props.data]);


  const handleInputChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...editableData];
    newData[rowIndex][colIndex] = value;
    setEditableData(newData);
  };

  const generateTableHeader = () => (
    <thead>
      <tr>
        {props?.headers?.map((header, index) => (
          <th key={index}>{header}</th>
        ))}
      </tr>
    </thead>
  );

  const generateTableBody = () => (
    <tbody>
      {props?.data?.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, colIndex) => (
            <td key={colIndex}>
              {(
                (colIndex === 0 || row.length - 1 != colIndex) ?
                  <p>{cell}</p> :
                  ([4, 6, 7, 8].includes(rowIndex) ?
                    <input
                      type="text"
                      pattern="[0-9]*"
                      value={String(cell)}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange(rowIndex, colIndex, onlyNumbers);
                      }}
                    />
                    :
                    ([9]).includes(rowIndex) ?
                      <SelectDropdown
                        data={props.isca}
                        onChange={(e) => {
                          handleInputChange(rowIndex, colIndex, e.label)
                        }}
                        title={''}
                        height='30px'
                        width='250px'
                      />
                      :
                      ([10]).includes(rowIndex) ?
                        <SelectDropdown
                          data={props.fundo}
                          onChange={(e) => { handleInputChange(rowIndex, colIndex, e.label) }}
                          title={''}
                          height='30px'
                          width='250px'
                        />
                        :
                        <p>{cell}</p>
                  )
              )}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <TableStyle {...props}>
      {props.children}
      {generateTableHeader()}
      {generateTableBody()}
    </TableStyle>
  );
}

export { TableDate };
