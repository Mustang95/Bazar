import { request } from '../rede/httpClient';
import type { TResponseProduto } from '../utils/types';

export default async function Catalogo() {
  const produtos = (await request(
    'http://localhost:3000/api/produtos',
  )) as TResponseProduto;

  console.log(produtos);

  const listagem = () => {
    return produtos.data.map((produto) => (
      <div key={produto.id} style={{ width: 100, height: 100, color: 'red' }}>
        <div>{produto.titulo}</div>
        <div>{produto.precoCentavos}</div>
      </div>
    ));
  };

  return <div>{listagem()}</div>;
}
