import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

/**
 * Categorias iniciais sugeridas — PRD §11, na ordem do documento. O PRD só lista
 * categorias de despesa; sem nenhuma categoria de receita a transação "income" fica
 * inutilizável, então "Renda" foi acrescentada aqui (decisão razoável e documentada,
 * mesmo padrão usado nas migrations pra lacunas do PRD/ERD). "Transferências" usa
 * type "transfer"; "Outros" fica sem type (serve pra qualquer tipo de transação).
 */
export const DEFAULT_CATEGORIES: {
  name: string;
  type: TransactionType | null;
  subcategories: string[];
}[] = [
  { name: "Moradia", type: "expense", subcategories: ["Aluguel", "Condomínio", "Energia", "Água", "Gás", "Internet", "Manutenção", "Reforma"] },
  { name: "Alimentação", type: "expense", subcategories: ["Supermercado", "Restaurante", "Delivery", "Padaria"] },
  { name: "Transporte", type: "expense", subcategories: ["Combustível", "Estacionamento", "Uber/99", "Manutenção", "Seguro", "Impostos"] },
  { name: "Saúde", type: "expense", subcategories: ["Plano", "Medicamentos", "Consultas", "Exames"] },
  { name: "Pets", type: "expense", subcategories: ["Alimentação", "Veterinário", "Medicamentos", "Banho/tosa", "Acessórios"] },
  { name: "Assinaturas", type: "expense", subcategories: ["Streaming", "Software", "Aplicativos", "Clubes"] },
  { name: "Lazer", type: "expense", subcategories: ["Viagens", "Cinema", "Eventos", "Hobbies"] },
  { name: "Compras", type: "expense", subcategories: ["Roupas", "Eletrônicos", "Casa", "Outros"] },
  { name: "Educação", type: "expense", subcategories: [] },
  { name: "Seguros", type: "expense", subcategories: [] },
  { name: "Impostos", type: "expense", subcategories: [] },
  { name: "Investimentos", type: "expense", subcategories: [] },
  { name: "Renda", type: "income", subcategories: ["Salário", "Freelance", "Rendimentos", "Outros"] },
  { name: "Transferências", type: "transfer", subcategories: [] },
  { name: "Outros", type: null, subcategories: [] },
];
