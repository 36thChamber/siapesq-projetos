import Router from 'next/router'


export function getUserToken(){
  try{
    const token = global?.window?.localStorage.getItem("token");
    if(token){
      return token
    }else{
      Router.push('/login')  
    }
  }
  catch(err){
    throw(err)
  }
}

// export function _getUserToken(cookieName: any) {
//   if (typeof document !== "undefined") {
//     const name = cookieName + "=";
//     const decodedCookie = decodeURIComponent(document.cookie);
//     const cookieArray = decodedCookie.split(";");

//     for (let i = 0; i < cookieArray.length; i++) {
//       let cookie = cookieArray[i].trim();
//       if (cookie.indexOf(name) === 0) {
//         return cookie.substring(name.length, cookie.length);
//       }
//     }
//     return null;
//   } else {
//     return null;
//   }
// }
