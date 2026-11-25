// import React from "react";
// import styled from "./styled.module.css";
// import Input from "../../atoms/input/input";
// import Button from "../../atoms/button/button";
// import ButtonWhite from "../../atoms/button/buttonWhite";
// import Logo from "../../../assets/image/SIAPESQ-LOGO.jpg";
// import Link from "next/link";
// import H1 from "../../atoms/h1/index";
// import Head from "next/head";
// import GlobalFonts from "../../font/font";
// const forgotPass = () => {
//   function doNothing() { }

//   return (
//     <React.Fragment>
//       <GlobalFonts />

//       {/* <div className={styled['index']}> */}
//       <Head>
//         <title>SIAPESQ - Recuperar Senha</title>
//       </Head>
//       <div className={styled['div']}>
//         <div className={styled['group']}>
//           <div className={styled['group-2']}>
//             <H1>Esqueci Senha</H1>
//             <p className={styled['p']}>Para você recuperar sua senha, será enviado um e-mail para que você possa criar uma nova senha.</p>
//             <div className={styled['overlap-group-wrapper']}>
//               <div className={styled['overlap-group']}>
//                 <div className={styled['text-wrapper-2']}>Email</div>
//               </div>
//             </div>
//             <div className={styled['overlap-wrapper']}>
//               <Button
//                 fontcolor={"#ffffff"}
//                 backgroundcolor={"#2d81af"}
//                 width={100}
//                 left={18}
//                 text="Enviar E-mail"
//               ></Button>
//               <Link href="/login">
//                 <a>
//                   <ButtonWhite
//                     fontcolor={"red"}
//                     backgroundcolor={"white"}
//                     width={100}
//                     left={18}
//                     onClick={doNothing}
//                     text="Cancelar"
//                   ></ButtonWhite>
//                 </a>
//               </Link>
//             </div>

//           </div>
//           <img id="atom5" className={styled["Logo"]} src={Logo.src} />

//         </div>

//       </div>

//       {/* </div> */}
//     </React.Fragment>

//   );
// };


// export default forgotPass;