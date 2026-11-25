import path from "path";
import fs from 'fs/promises';
import os from 'os'
import dynamic from "next/dynamic";
import PdfArmadilha from "./pdfArmadilha";
import PdfEspinhel from "./pdfEspinhel";
import PdfCerco from "./pdfCerco";
import PdfEmalhe from "./pdfEmalhe";

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((module) => module.PDFDownloadLink), {
  ssr: false,
});



function DownloadPdf(props) {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0'); // Meses são indexados a partir de 0
  const ano = data.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const renderPDFLink = (PdfComponent, fileName) => (
    <PDFDownloadLink
      document={<PdfComponent dadosMapa={props.mapaEncontrado} />}
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => {

        return (
          <>
            {loading ? (
              <div>Gerando PDF...</div>
            ) : (
              <div style={{ zIndex: 1000 }}>
                {props.mostrarDiv && (
                  <div
                    style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      padding: '16px',
                      background: '#fff',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      zIndex: 1000,
                    }}
                  >
                    <p style={{ color: 'darkBlue' }}>Confirmar Download do relatório?</p>
                    <button
                      onClick={async () => {
                        if (blob) {
                          const reader = new FileReader();
                          reader.readAsArrayBuffer(blob);

                          reader.onload = async function () {
                            const blobData = reader.result;
                            const diretorioUser = os.homedir();
                            const path_pdf = path.join(
                              diretorioUser,
                              'Siapesq/documents',
                              `SIAPRES_${new Date().getMilliseconds()}.pdf`
                            );
                            console.log(path_pdf);
                            console.log(blobData);
                            await fs.writeFile(path_pdf, Buffer.from(blobData));
                          };

                          props.setMostrarDiv(false);
                        } else {
                          console.error('Blob ainda não está disponível');
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '16px',
                        background: '#f2f2f2',
                        color: '#333',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '8px',
                      }}
                    >
                      Baixar PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )
      }}
    </PDFDownloadLink>


  );

  switch (props.setTipoDeArte) {
    case 'espinhel':
      return renderPDFLink(PdfEspinhel, `relatorio_espinhel-${dataFormatada}.pdf`);
    case 'armadilha':
      return renderPDFLink(PdfArmadilha, `relatorio_armadilha-${dataFormatada}.pdf`);
    case 'emalhar':
      return renderPDFLink(PdfEmalhe, `relatorio_emalhe-${dataFormatada}.pdf`);
    case 'cerco':
      return renderPDFLink(PdfCerco, `relatorio_cerco-${dataFormatada}.pdf`);
    default:
      return null;
  }
}

export default DownloadPdf;
