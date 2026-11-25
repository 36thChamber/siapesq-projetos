// import React, { useEffect, useState } from "react";
// import styled from  "./style.module.css";
// import ButtonWhite from "../../atoms/button/buttonWhite";
// import Button from "../../atoms/button/button";
// import Input from "../../atoms/input/input";
// import Link from "next/link";
// import H1 from "../../atoms/h1";
// import Head from "next/head";
// import GlobalFonts from "../../font/font";



// function Tripulante() {
//   const [nome, setNome] = useState('');
//   const [cpf, setCpf] = useState('');
//   const [email, setEmail] = useState('');
//   const [senha, setSenha] = useState('');


//   return (
    
//     <>
//     <GlobalFonts />
//     <div className={styled["index"]}>

//       <Head>
//         <title>SIAPESQ - Criar Tripulante</title>
//       </Head>

//       <div className={styled["div"]}>
//         <div className={styled["group"]}>
//           <div className={styled["frame"]}>
//             <Input
//               type="text"
//               placeholder="Nome"
//               value={nome}
//               onChange={(e) => setNome(e.target.value)} />

//             <Input
//               type="text"
//               placeholder="CPF"
//               value={cpf}
//               onChange={(e) => setCpf(e.target.value)} />

//             <Input
//               type="text"
//               placeholder="Email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)} />

//             <Input
//               type="password"
//               placeholder="Senha"
//               value={senha}
//               onChange={(e) => setSenha(e.target.value)} />
//           </div>
//         </div>

//         <div className={styled["group-2"]}>
//           <H1>Criar Tripulante</H1>
//         </div>

//         <div className={styled["overlap-wrapper"]}>
//           <Button fontcolor={'#ffffff'} backgroundcolor={'#2d81af'} width={100} left={-20} text="Criar"></Button>
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

// export default Tripulante;
