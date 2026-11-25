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
    border: ${props => props.border};
    width: ${props => props.width};
    margin-top: ${props => props.margintop};
    text-align: center;
    color: #333333;
    margin-left: ${props => props.marginleft};

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
        padding: 10px;
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
  data: string[][],
  isca: { id: string; nome: string; }[],
  fundo: { id: string; nome: string; }[],
  width?: string | number,
  margintop?: string | number,
  marginleft?: string | number,
  border?: string | number,
  children?: ReactNode
};

function TableIncidentesEm(props: TableProps) {
  const [editableData, setEditableData] = useState<string[][]>(props.data);

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
                <input
                  type="text"
                  value={cell}
                  onChange={(e) => {
                    handleInputChange(rowIndex, colIndex, e.target.value);
                  }}
                />
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

export { TableIncidentesEm };
