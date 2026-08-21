/** Estado padrão devolvido por Server Actions ligadas a useActionState nas telas financeiras. */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
} | null;
