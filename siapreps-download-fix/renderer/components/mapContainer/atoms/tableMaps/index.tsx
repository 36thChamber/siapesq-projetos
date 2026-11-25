import React, { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';

type TableStyleProps = {
  width?: string | number,
  margintop?: string | number,
  marginleft?: string | number,
  border?: string | number
};

export const TableStyle = styled.table<TableStyleProps>`
    font-family: "Poppins-Bold";
    font-size: 13px;
    border-collapse: collapse;
    border: ${props => props.border};
    width: ${props => props.width};
    margin-top: ${props => props.margintop};
    text-align: center;
    color: #333333;
    margin-left: ${props => props.marginleft};

    thead tr {
        background-color: #CCF5FE;
    }

    tr {
        font-size: 13px;
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
`;

type TableProps = {
  columns: number,
  headers: string[],
  data: string[][],
  width?: string | number,
  margintop?: string | number,
  marginleft?: string | number,
  border?: string | number,
  children?: ReactNode,
  baixar?: (inicioLinha: string) => void
};

function TableMaps(props: TableProps) {
  const [, setEditableData] = useState<string[][]>(props.data);

  useEffect(() => {
    setEditableData(props.data);
  }, [props.data]);

  const generateTableHeader = () => (
    <thead>
      <tr>
        {Array.isArray(props.headers) && props.headers.map((header, index) => (
          <th key={index}>{header}</th>
        ))}
      </tr>
    </thead>
  );

  const generateTableBody = () => (
    <tbody>
      {Array.isArray(props.data) && props.data.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, colIndex) => (
            <td key={colIndex}>
              {(
                row.length-1 === colIndex ?
                  <button onClick={() => props.baixar && props.baixar(row[0])} style={{ cursor: "pointer", border: "none", background: "none" }}>
                    <img src='/images/salvar.png'/>
                  </button>
                  :
                  <p style={{opacity:0.8, padding:0}}>{cell}</p>
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

export default TableMaps;