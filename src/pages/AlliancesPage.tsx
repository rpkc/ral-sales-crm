/**
 * Dedicated Industry Alliances CRM page.
 * Hosts the full AllianceModule with role-aware scope, and reads URL params:
 *   ?tab=institutions|visits|tasks|proposals|events|expenses|reports|contacts
 *   ?action=new           → auto-open the create form for that tab
 *   ?stage=Negotiation    → applied as a hint for institution filtering (future)
 *   ?executive=ae1        → applied as scope hint
 */
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AllianceModule } from "@/components/alliance/AllianceModule";

export default function AlliancesPage() {
  const { currentUser } = useAuth();
  const [params] = useSearchParams();

  const isExecutive = currentUser?.role === "alliance_executive";
  const scope: "manager" | "executive" = isExecutive ? "executive" : "manager";

  return (
    <AllianceModule
      scope={scope}
      executiveId={isExecutive ? currentUser?.id : params.get("executive") || undefined}
      initialTab={params.get("tab") || undefined}
      initialAction={params.get("action") || undefined}
      initialStageFilter={params.get("stage") || undefined}
      initialDistrictFilter={params.get("district") || undefined}
    />
  );
}
