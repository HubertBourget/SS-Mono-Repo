// import React, { useState } from "react";
// import styled from "styled-components";
// import NavigationButton from "../components/CloudStudioComponents/NavigationButton";
// import LibraryIcon from "../assets/library-icon.png";
// import { Outlet, useNavigate } from "react-router-dom";
// import SacredSoundLogo from "../assets/Logo.png";
// export default function Sidebar() {
//   const navigate = useNavigate()
//   const [activeComponent, setActiveComponent] = useState("library");
//   const handleSectionChange = (componentName) => {
//     navigate(componentName);
//     setActiveComponent(componentName);
//   };
//   return (
//     <>
//       <div style={{ display: "flex", flexDirection: "row" }}>
//         <MainContainer>
//           <HeaderContainer>
//             <Header>
//               <Logo></Logo>
//             </Header>
//           </HeaderContainer>
//           <hr />
//           <FlexContainer>
//             <NavigationPanel>
//               <NavigationButton
//                 onClick={() => handleSectionChange("library", false)}
//                 active={activeComponent === "library"}
//               >
//                 <img
//                   src={LibraryIcon}
//                   alt="Upload"
//                   style={{ marginRight: "8px" }}
//                 />
//                 Library
//               </NavigationButton>
//             </NavigationPanel>
//           </FlexContainer>
//         </MainContainer>
//         <RightContent>
//           <Outlet />
//         </RightContent>
//       </div>
//     </>
//   );
// }

// const MainContainer = styled.div`
//   height: 100%;
//   width: 20%;
//   display: inline-block;
//   border-right: 1px solid rgb(191, 187, 187);
// `;

// const Header = styled.div`
//   width: 100%;
//   align-items: center;
// `;

// const HeaderContainer = styled.div`
//   display: flex;
//   flex-direction: row;
//   height: 12vh;
// `;

// const FlexContainer = styled.div`
//   display: flex;
//   overflow: hidden;
// `;

// const NavigationPanel = styled.div`
//   display: flex;
//   flex-direction: column;
//   height: 88vh;
//   width: 100%;
// `;

// const Logo = styled.div`
//   height: 80%;
//   width: 90%;
//   font-size: 1.5em;
//   margin-left: 1vw;
//   background-image: url(${SacredSoundLogo});
//   background-repeat: no-repeat;
//   background-size: contain;
//   background-position: center;
// `;

// const RightContent = styled.div`
//   width: 79%;
//   height: 100%;
//   display: inline-block;
// `;
