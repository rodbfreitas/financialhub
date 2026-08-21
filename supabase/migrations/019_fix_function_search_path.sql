-- 019: fixa search_path das funções novas da Etapa 6 (017/018) — o linter de segurança
-- do Supabase aponta "Function Search Path Mutable" para funções sem search_path fixo,
-- que em teoria são vulneráveis a um ataque de search_path hijacking (um objeto com o
-- mesmo nome criado num schema anterior no path). Nenhuma delas é SECURITY DEFINER
-- (rodam com o papel do chamador, sob RLS), mas fixar o search_path é boa prática
-- recomendada mesmo assim.
alter function upsert_credit_card_bill_delta(uuid, uuid, date, date, date, numeric) set search_path = public;
alter function adjust_account_balance(uuid, numeric) set search_path = public;
alter function replace_transaction_splits(uuid, jsonb) set search_path = public;
