import {fireEvent,render,screen} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import SobreForm from "./sobreForm";
import {TestEnvironmentProvider} from "@/context/TestEnvironmentContext";
import apiClient from "@/services/api/apiClient";
vi.mock("@/services/api/apiClient",()=>({default:{post:vi.fn()}}));
vi.mock("@/context/PlatformThemeContext",()=>({usePlatformTheme:()=>({theme:{colors:{titleColor:"#123",primary:{500:"#123"}}}})}));
it("does not submit external contact messages from the test clone",()=>{
 render(<TestEnvironmentProvider testMode><SobreForm /></TestEnvironmentProvider>);
 const button=screen.getByRole("button",{name:"Envio desativado no teste"});expect((button as HTMLButtonElement).disabled).toBe(true);
 fireEvent.submit(button.closest("form")!);expect(apiClient.post).not.toHaveBeenCalled();
});
