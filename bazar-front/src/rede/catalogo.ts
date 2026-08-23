import type { TResponseProduto } from '../utils/types';
import { request } from './httpClient';

export async function getCatalogoTodosProdutos(): Promise<TResponseProduto> {
  const produtos = (await request(
    'http://localhost:3000/api/produtos/todos',
  )) as TResponseProduto;
  return produtos;
}

export async function getCatalogoProdutosPaginado(): Promise<TResponseProduto> {
  const produtos = (await request(
    'http://localhost:3000/api/produtos',
  )) as TResponseProduto;
  return produtos;
}
