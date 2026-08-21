export function FormFieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="mt-1.5 text-xs text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function FormAlert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={
        variant === "error"
          ? "mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "mb-4 rounded-md border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive"
      }
    >
      {children}
    </div>
  );
}
