import RoleGate from "@/components/RoleGate";

export default function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={["author", "admin"]}>
      {children}
    </RoleGate>
  );
}
