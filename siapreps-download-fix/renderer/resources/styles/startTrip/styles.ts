import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const Container = styled.div`
  background-color: #ffffff;
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 100%;
`;

export const DivStyles = styled.div`
  background-color: #ffffff;
    height: 506px;
    position: relative;
    width: 657px;
`;

export const Overlap = styled.div`
  height: 51px;
  left: 175px;
  position: absolute;
  top: 151px;
  width: 331px;
`;

export const Group = styled.div`
  height: 51px;
  left: 0;
  position: absolute;
  top: 0;
  width: 331px;
`;

export const OverlapGroup = styled.div`
  height: 51px;
  position: relative;
`;

export const Rectangle = styled.div`
  background-color: #ffffff;
  border: 1px solid;
  border-color: #000000;
  border-radius: 10px;
  height: 45px;
  left: 0;
  position: absolute;
  top: 6px;
  width: 331px;
`;

export const OverlapGroupWrapper = styled.div`
  height: 19px;
  left: 5px;
  position: absolute;
  top: 0;
  width: 172px;
`;

export const DivWrapper = styled.div`
  background-color: #ffffff;
  height: 19px;
  position: relative;
  width: 170px;
`;

export const TextWrapper = styled.div`
  color: #000000;
  font-family: "Poppins-bold";
  font-size: 14px;
  font-weight: 400;
  left: 5px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 0;
  width: 164px;
`;

export const EpArrowUp = styled.div`
  height: 25px;
  left: 291px;
  position: absolute;
  top: 16px;
  width: 25px;
`;

export const Overlap2 = styled.div`
  height: 51px;
  left: 175px;
  position: absolute;
  top: 355px;
  width: 331px;
`;

export const Img = styled.img`
    width: auto;
    height: 100%;   
    right: 50px;
    top:-20px;
    position: relative;
`;

export const Overlap3 = styled.div`
  height: 51px;
  left: 175px;
  position: absolute;
  top: 288px;
  width: 331px;
`;

export const Group2 = styled.div`
  height: 19px;
  left: 5px;
  position: absolute;
  top: 0;
  width: 103px;
`;

export const OverlapGroup2 = styled.div`
  background-color: #ffffff;
  height: 19px;
  position: relative;
  width: 101px;
`;

export const TextWrapper2 = styled.div`
  color: #000000;
  font-family: "Poppins-bold";
  font-size: 14px;
  font-weight: 400;
  left: 3px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 0;
  width: 97px;
`;

export const Overlap4 = styled.div`
  height: 51px;
  left: 170px;
  position: absolute;
  top: 219px;
  width: 163px;
`;

export const OverlapWrapper = styled.div`
  height: 51px;
  left: 0;
  position: absolute;
  top: 0;
  width: 163px;
`;

export const Rectangle2 = styled.div`
  background-color: #ffffff;
  border: 1px solid;
  border-color: #000000;
  border-radius: 10px;
  height: 45px;
  left: 0;
  position: absolute;
  top: 6px;
  width: 163px;
`;

export const Group3 = styled.div`
  height: 21px;
  left: 3px;
  position: absolute;
  top: 0;
  width: 81px;
`;

export const OverlapGroup3 = styled.div`
  height: 21px;
  position: relative;
  width: 79px;
`;

export const Rectangle3 = styled.div`
  background-color: #ffffff;
  height: 19px;
  left: 0;
  position: absolute;
  top: 2px;
  width: 79px;
`;

export const TextWrapper3 = styled.div`
  color: #000000;
  font-family: "Poppins-bold";
  font-size: 14px;
  font-weight: 400;
  left: 5px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 0;
  width: 74px;
`;

export const EpArrowUp2 = styled.div`
  height: 25px;
  left: 126px;
  position: absolute;
  top: 16px;
  width: 25px;
`;

export const Overlap5 = styled.div`
  height: 49px;
  left: 350px;
  position: absolute;
  top: 221px;
  width: 155px;
`;

export const Group4 = styled.div`
  height: 49px;
  left: 0;
  position: absolute;
  top: 0;
  width: 163px;
`;

export const Overlap6 = styled.div`
  height: 49px;
  position: relative;
`;

export const Rectangle4 = styled.div`
  background-color: #ffffff;
  border: 1px solid;
  border-color: #00000047;
  border-radius: 9px;
  height: 42px;
  left: 0;
  position: absolute;
  top: 22px;
  width: 150px;
`;

export const Group5 = styled.div`
  height: 20px;
  left: 3px;
  position: absolute;
  top: 0;
  width: 96px;
`;

export const OverlapGroup4 = styled.div`
  height: 20px;
  position: relative;
  width: 94px;
`;

export const TextWrapper4 = styled.div`
  color: #000000;
  font-family: "Poppins-Regular";
  font-size: 16px;
  font-weight: 400;
  left: 1px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: -1px;
  white-space: nowrap;
  width: 89px;
`;

export const TextWrapper5 = styled.div`
  color: #000000;
  font-family: "Poppins-Regular";
  font-size: 14px;
  font-weight: 400;
  left: 35px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 34px;
  white-space: nowrap;
`;

export const Group6 = styled.div`
  height: 45px;
  left: 351px;
  position: absolute;
  top: 450px;
  width: 157px;
`;

export const Overlap7 = styled.div`
  background-color: #2d81af;
  border-radius: 10px;
  height: 45px;
  position: relative;
  width: 155px;
`;

export const TextWrapper6 = styled.div`
  color: #ffffff;
  font-family: "Poppins-bold";
  font-size: 16px;
  font-weight: 700;
  left: 43px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 13px;
  white-space: nowrap;
  width: 67px;
`;

export const Group7 = styled.div`
  height: 45px;
  left: 175px;
  position: absolute;
  top: 450px;
  width: 153px;
`;

export const Overlap8 = styled.div`
  background-color: #ffffff;
  border: 1px solid;
  border-color: #2d81af;
  border-radius: 10px;
  height: 45px;
  position: relative;
  width: 151px;
`;

export const TextWrapper7 = styled.div`
  color: #2d81af;
  font-family: "Poppins-bold";
  font-size: 16px;
  font-weight: 700;
  left: 51px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 12px;
  white-space: nowrap;
  width:48px;
`;

export const LogoContainer = styled.div `
  height: 100px; 
  left: 200px; 
  position: absolute; 
  top: 20px; 
  width: 250px;
`;

export const IndexContainer = styled.div`
 background-color: #ffffff; 
 display: flex; 
 flex-direction: row; 
 justify-content: center; 
 width: 100%;
`;

export const DivContainer = styled.div` 
  background-color: #ffffff; 
  height: 506px; 
  position: relative; 
  width: 657px;
`;

export const SplashContainer = styled.div`
  text-align: center; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  align-items: center; 
  height: 100vh; 
  background-color: #ffffff; 
  zoom: 95%;
`;

export const Loader = styled.div`
  display: block; 
  top: 0; 
  margin: 25px; 
  margin-left: 90%; 
  position: absolute; 
  border: 8px solid #f3f3f3; 
  border-top: 8px solid #3498db;
  border-radius: 50%; 
  width: 60px; 
  height: 60px; 
  animation: spin 2s linear infinite; 
  margin-bottom: 16px;
`;

export const LogoImg = styled.div`
    height: 100px;
    left: 195px;
    position: absolute;
    width: 250px;
    top: 55px;
`
export const Text = styled.h2`
  font-size: 20px;
  font-family: "Poppins-bold"; 
  margin-left: 50px; 
  top: 70px; 
  color: #00286E;
`;

export const PageWrapper = styled.div`
  display: flex; 
  flex-direction: column; 
  align-items: center;
`;


export const Spinner = styled.div` 
  display: block; 
  top: 0; 
  margin: 25px; 
  margin-left: 90%; 
  position: absolute; 
  border: 8px solid #f3f3f3; 
  border-top: 8px solid #3498db; 
  border-radius: 50%;
  width: 60px; 
  height: 60px; 
  animation: ${spin} 2s linear infinite; 
  margin-bottom: 16px;
`;
