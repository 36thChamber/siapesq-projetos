import Image from "next/image";
import LoginForm from "../components/login";

export default function Login() {
  return (
    <div className="login-page">
      <div className="side-container"></div>
      <div className="login-section">
        <LoginForm />
      </div>
      <div className="login-logos">
        <Image
          src={"/images/logos/hubittat.svg"}
          width={"150"}
          height={"150"}
          alt="Logo da Hubittat"
        />
        <Image
          src={"/images/logos/ste.svg"}
          width={"150"}
          height={"150"}
          alt="Logo da Hubittat"
        />
      </div>
    </div>
  );
}
