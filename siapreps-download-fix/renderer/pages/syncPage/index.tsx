import styles from './styles.module.css';
import Logo from '../../components/assets/image/SIAPESQ-LOGO.jpg';
import { haveConection } from '../../components/funcao/funcoesDeAcao';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import GlobalFonts from '../../components/assets/font/font';
import { Loader, Logoimag } from '../../resources/styles/syncPage/styles';

function syncPage(){
    const isOnline = haveConection();
    const router = useRouter();
  
    useEffect(() => {
      if (isOnline) {
        router.back(); // Volta para a página anterior
       }
    }, [isOnline]);

    return(
        <div className={styles["splash-screen"]} style={{display: 'flex', flexDirection:'column'}}>
            <GlobalFonts/>
            <Loader/>
            <Logoimag>
                 <img id="atom5" src={Logo.src} alt="SIAPESQ Logo" />
            </Logoimag>
            
            
            <h2 style={{ fontSize: '20px', fontFamily:'Poppins-bold',marginLeft: '50px', top:'70px', color: '#00286E' }}>
                Aguardando conexão com a internet ...
            </h2>

        </div>
    )
}

export default syncPage;
