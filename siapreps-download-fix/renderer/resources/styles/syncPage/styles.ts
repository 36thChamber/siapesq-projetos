import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const SplashScreenContainer = styled.div`
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
  animation: ${spin} 2s linear infinite;
  margin-bottom: 16px;
`;

export const Logoimag = styled.div`
  height: 200px;
  position: fixed;
  text-align: center;
  top: 30%;
  width: 600px;

  img {
    height: 100%;
    width: 100%;
    object-fit: contain;
  }
`;

export const SIM = styled.div`
  width: 30px;
`;
