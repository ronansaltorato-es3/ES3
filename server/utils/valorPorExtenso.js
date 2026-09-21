const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = [
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

function grupoPorExtenso(numero) {
  if (numero === 0) return '';
  if (numero === 100) return 'cem';

  const centena = Math.floor(numero / 100);
  const resto = numero % 100;
  const partes = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 10) {
      partes.push(UNIDADES[resto]);
    } else if (resto < 20) {
      partes.push(DEZ_A_DEZENOVE[resto - 10]);
    } else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade > 0 ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }

  return partes.join(' e ');
}

const ESCALAS = [
  { valor: 1_000_000_000, singular: 'bilhão', plural: 'bilhões' },
  { valor: 1_000_000, singular: 'milhão', plural: 'milhões' },
  { valor: 1_000, singular: 'mil', plural: 'mil' },
];

function inteiroPorExtenso(numero) {
  if (numero === 0) return 'zero';

  // Cada grupo guarda o texto e o valor "cru" daquele grupo (0-999),
  // usado para decidir se a ligação com o próximo grupo é "," ou " e ".
  const grupos = [];
  let restante = numero;

  for (const escala of ESCALAS) {
    const quantidade = Math.floor(restante / escala.valor);
    if (quantidade > 0) {
      const texto = escala.valor === 1000 && quantidade === 1
        ? 'mil'
        : `${grupoPorExtenso(quantidade)} ${quantidade === 1 ? escala.singular : escala.plural}`;
      grupos.push({ texto, valor: quantidade });
      restante %= escala.valor;
    }
  }

  if (restante > 0) {
    grupos.push({ texto: grupoPorExtenso(restante), valor: restante });
  }

  if (grupos.length === 1) return grupos[0].texto;

  const ultimo = grupos[grupos.length - 1];
  const usaE = ultimo.valor < 100 || ultimo.valor % 100 === 0;
  const inicio = grupos.slice(0, -1).map((g) => g.texto).join(', ');
  return usaE ? `${inicio} e ${ultimo.texto}` : `${inicio}, ${ultimo.texto}`;
}

function valorPorExtenso(valor) {
  const arredondado = Math.round(Math.abs(valor) * 100) / 100;
  const reais = Math.floor(arredondado);
  const centavos = Math.round((arredondado - reais) * 100);

  const textoReais = `${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`;
  if (centavos === 0) return textoReais;

  const textoCentavos = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  return `${textoReais} e ${textoCentavos}`;
}

module.exports = valorPorExtenso;
