// // import React from "react";
// // import "./style.module.css";

// // export default function MapaBordo()  {

// //   return (
// //     <div className="index">
// //       <div className="div">
// //         <div className="overlap">
// //           <div className="group">
// //             <div className="overlap-group">
// //               <div className="rectangle" />
// //               <div className="overlap-group-wrapper">
// //                 <div className="div-wrapper">
// //                   <div className="text-wrapper">Selecione a embarcação</div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //           <img className="ep-arrow-up" alt="Ep arrow up" src="ep-arrow-up.svg" />
// //         </div>
// //         <div className="overlap-2">
// //           <div className="group">
// //             <div className="overlap-group">
// //               <div className="rectangle" />
// //               <div className="overlap-group-wrapper">
// //                 <div className="div-wrapper">
// //                   <div className="text-wrapper">Selecione o espécie alvo</div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //           <img className="img" alt="Ep arrow up" src="image.svg" />
// //         </div>
// //         <div className="overlap-3">
// //           <div className="group">
// //             <div className="overlap-group">
// //               <div className="rectangle" />
// //               <div className="group-2">
// //                 <div className="overlap-group-2">
// //                   <div className="text-wrapper-2">Tipo de pesca</div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //           <img className="img" alt="Ep arrow up" src="ep-arrow-up-3.svg" />
// //         </div>
// //         <div className="overlap-4">
// //           <div className="overlap-wrapper">
// //             <div className="overlap-group">
// //               <div className="rectangle-2" />
// //               <div className="group-3">
// //                 <div className="overlap-group-3">
// //                   <div className="rectangle-3" />
// //                   <div className="text-wrapper-3">Saída porto</div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //           <img className="ep-arrow-up-2" alt="Ep arrow up" src="ep-arrow-up-2.svg" />
// //         </div>
// //         <div className="overlap-5">
// //           <div className="group-4">
// //             <div className="overlap-6">
// //               <div className="rectangle-4" />
// //               <div className="group-5">
// //                 <div className="overlap-group-4">
// //                   <div className="rectangle-5" />
// //                   <div className="text-wrapper-4">Data de saída</div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //           <div className="text-wrapper-5">12/04/2023</div>
// //         </div>
// //         <div className="group-6">
// //           <div className="overlap-7">
// //             <div className="text-wrapper-6">Começar</div>
// //           </div>
// //         </div>
// //         <div className="group-7">
// //           <div className="overlap-8">
// //             <div className="text-wrapper-7">Voltar</div>
// //           </div>
// //         </div>
// //         <img className="element" alt="Element" src="4.png" />
// //       </div>
// //     </div>
// //   );
// // };
// import React, { useEffect, useState } from "react";
// import styled from  "./style.module.css";
// import ButtonWhite from "../../atoms/button/buttonWhite";
// import Button from "../../atoms/button/button";
// import Input from "../../atoms/input/input";
// import Link from "next/link";
// import H1 from "../../atoms/h1";
// import Head from "next/head";
// import GlobalFonts from "../../font/font";
// const adjustWindowSize = () => {
//   const minWidth = 800;
//   const minHeight = 800;

//   const { innerWidth, innerHeight } = window;

//   if (innerWidth < minWidth || innerHeight < minHeight) {
//     window.resizeTo(minWidth, minHeight);
//   }
// };

// function MapaBordo() {
 

//   useEffect(() => {
//     adjustWindowSize();
//     window.addEventListener('resize', adjustWindowSize);

//     return () => {
//       window.removeEventListener('resize', adjustWindowSize);
//     };
//   }, []);

//   return (
//     <>
//     <GlobalFonts />
//     <div className={styled["index"]}>
//       <Head>
//         <title>SIAPESQ -Histórico Mapa de Bordo</title>
//       </Head>
//       <div className={styled["div"]}>
//         <div className={styled["group"]}>
//           <div className={styled["frame"]}>

//           </div>
//         </div>

//         <div className={styled["group-2"]}>
//           <H1>Histórico Mapa de Bordo</H1>
//         </div>

//         <div className={styled["div-wrapper"]}>
//           <Link href="/home">

//             <ButtonWhite fontcolor={'#2d81af'} backgroundcolor={'white'} width={100} left={-20} text="Voltar"></ButtonWhite>
//           </Link>
//         </div>
//       </div>
//     </div></>
//   );
// }

// export default MapaBordo;
