import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/imports/csv";

describe("parseCsv", () => {
  it("faz o parse básico com vírgula", () => {
    const result = parseCsv("data,descricao,valor\n2026-01-01,Mercado,100.00\n2026-01-02,Farmacia,50.00");
    expect(result.headers).toEqual(["data", "descricao", "valor"]);
    expect(result.rows).toEqual([
      ["2026-01-01", "Mercado", "100.00"],
      ["2026-01-02", "Farmacia", "50.00"],
    ]);
  });

  it("detecta ponto-e-vírgula (padrão de banco brasileiro)", () => {
    const result = parseCsv("data;descricao;valor\n01/01/2026;Mercado;100,00");
    expect(result.headers).toEqual(["data", "descricao", "valor"]);
    expect(result.rows).toEqual([["01/01/2026", "Mercado", "100,00"]]);
  });

  it("detecta tab como delimitador", () => {
    const result = parseCsv("data\tdescricao\tvalor\n01/01/2026\tMercado\t100,00");
    expect(result.headers).toEqual(["data", "descricao", "valor"]);
  });

  it("respeita valor entre aspas com delimitador dentro (RFC 4180)", () => {
    const result = parseCsv('data,descricao,valor\n2026-01-01,"Mercado, Loja 2",100.00');
    expect(result.rows[0]).toEqual(["2026-01-01", "Mercado, Loja 2", "100.00"]);
  });

  it("respeita aspas escapadas (duplicadas) dentro de campo entre aspas", () => {
    const result = parseCsv('data,descricao\n2026-01-01,"Restaurante ""Bom Prato"""');
    expect(result.rows[0]).toEqual(["2026-01-01", 'Restaurante "Bom Prato"']);
  });

  it("respeita quebra de linha dentro de campo entre aspas", () => {
    const result = parseCsv('data,descricao\n2026-01-01,"linha 1\nlinha 2"');
    expect(result.rows[0]).toEqual(["2026-01-01", "linha 1\nlinha 2"]);
  });

  it("ignora BOM e normaliza CRLF", () => {
    const result = parseCsv("﻿data,descricao\r\n2026-01-01,Mercado\r\n");
    expect(result.headers).toEqual(["data", "descricao"]);
    expect(result.rows).toEqual([["2026-01-01", "Mercado"]]);
  });

  it("ignora linhas totalmente vazias", () => {
    const result = parseCsv("data,descricao\n2026-01-01,Mercado\n\n,\n2026-01-02,Farmacia");
    expect(result.rows).toHaveLength(2);
  });

  it("texto vazio devolve grid vazio", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});
