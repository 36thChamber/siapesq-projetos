import {render,screen} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import PlanGrid from "./index";
import type {PlanAPI,PlanUI} from "@/services/types/plano.types";
vi.mock("@/components/PlanCard",()=>({default:({plan}:{plan:PlanUI})=><p>{plan.name}: R$ {plan.price}/{plan.periodicity}</p>}));
it("shows the total used by checkout, including PostgreSQL decimal strings",()=>{
 const plan={id_plano:"annual",nome:"Anual",ativo:true,periodicidade:"anual",especies_disponiveis:2,especies_ilimitadas:false,valor_mensal:"9.99",valor_total:"119.90"} as unknown as PlanAPI;
 render(<PlanGrid plans={[plan]} currentUserPlanName="Free" />);
 expect(screen.getByText("Anual: R$ 119,90/anual")).toBeTruthy();
});
