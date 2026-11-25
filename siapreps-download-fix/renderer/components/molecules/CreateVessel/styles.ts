import styled from 'styled-components';

export const Index = styled.div`
  background-color: #ffffff;
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  height: 15.5%;
  margin-bottom: 220px;
`;

export const Div = styled.div`
  background-color: #ffffff;
  border-color: #000000;
  height: 20px;
  top: -10px;
  position: relative;
  width: 657px;
`;

export const Messagestyles = styled.div`
  position: absolute;
  left: 50px;
  bottom: 10px;
  z-index: 1;
`;

export const Group = styled.div`
  height: 566px;
  left: 175px;
  position: absolute;
  width: 308px;
`;

export const Frame = styled.div`
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 80px;
`;

export const OverlapGroupWrapper = styled.div`
    height: 45px;
    left: 175px;
    position: absolute;
    top: 575px;
    width: 330px;
`;

export const OverlapGroup = styled.div`
  background-color: #ffffff;
  border: 1px solid #000000;
  border-radius: 10px;
  height: 45px;
  position: relative;
  width: 308px;
`;

export const TextWrapper = styled.div<{ width: string }>`
  color: #00000080;
  font-family: "Poppins-Regular";
  font-size: 14px;
  font-weight: 400;
  left: 16px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 12px;
  white-space: nowrap;
  width: ${(props) => props.width};
`;

export const Unsplash = styled.img`
  height: 97px;
  left: 105px;
  position: absolute;
  top: 0;
  width: 97px;
`;

export const Group2 = styled.div`
  height: 36px;
  left: 180px;
  position: absolute;
  top: 30px;
  width: 270px;
`;

export const TextWrapper8 = styled.div`
  color: #3e3e3e;
  font-family: "Poppins-Bold";
  font-size: 24px;
  font-weight: 700;
  left: 24px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 0;
`;

export const FluentIosArrow = styled.div`
  height: 24px;
  left: 0;
  position: absolute;
  top: 6px;
  width: 24px;
`;

export const OverlapWrapper = styled.div`
  height: 45px;
  left: 170px;
  position: absolute;
  top: 620px;
  width: 313px;
`;

export const Overlap = styled.div`
  background-color: #2d81af;
  border-radius: 10px;
  height: 45px;
  position: relative;
  width: 144px;
`;

export const TextWrapper9 = styled.div`
  color: #ffffff;
  font-family: "Poppins-Bold";
  font-size: 16px;
  font-weight: 700;
  left: 55px;
  letter-spacing: 0;
  line-height: normal;
  position: absolute;
  top: 13px;
  width: 43px;
`;

export const DivWrapper = styled.div`
  height: 28px;
  left: 175px;
  position: absolute;
  top: 20px;
  width: 169px;
`;

export const Overlap2 = styled.div`
  background-color: #ffffff;
  border: 1px solid #2d81af;
  border-radius: 10px;
  height: 45px;
  position: relative;
  width: 141px;
`;
