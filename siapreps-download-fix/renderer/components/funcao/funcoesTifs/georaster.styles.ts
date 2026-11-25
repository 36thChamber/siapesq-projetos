import styled from "styled-components";

export const Tooltip = styled.div`
  position: absolute;
  top: 80px;
  left: 25.5em;
  transform: translateX(-50%);
  background-color: rgba(20, 26, 34, 0.75);
  z-index: 1000;
  border-radius: 10px;
  font-family: "Poppins-Bold";
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

export const TooltipText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  padding: 7px;
`;

export const Loading = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

export const LoadingBox = styled.div`
  background: rgba(20, 26, 34, 0.9);
  padding: 20px 30px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const LoadingText = styled.p`
  color: white;
  font-size: 1.5rem;
  font-family: "Poppins-Bold";
  margin-top: 10px;
`;


export const RotatingImage = styled.div`
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;