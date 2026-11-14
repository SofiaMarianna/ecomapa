const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

async function requestData(path, { signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
      'Não foi possível conectar à API. Verifique a conexão e tente novamente.',
    );
  }

 let payload;

try {
  payload = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    throw error;
  }

  if (!response.ok) {
    throw new Error(`A API respondeu com erro (${response.status}).`);
  }

  throw new Error('A API retornou uma resposta inválida.');
}

  if (!response.ok) {
  const message =
    typeof payload?.error?.message === 'string'
      ? payload.error.message
      : typeof payload?.message === 'string'
        ? payload.message
        : `A API respondeu com erro (${response.status}).`;

  throw new Error(message);
}

  if (!payload || !Object.hasOwn(payload, 'data')) {
    throw new Error('A resposta da API não possui o formato esperado.');
  }

  return payload.data;
}

export function getEcoPointsByBounds(bounds, { signal } = {}) {
  const params = new URLSearchParams({
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
  });

  return requestData(`/eco-points?${params.toString()}`, { signal });
}

export function getEcoPointById(id, { signal } = {}) {
  return requestData(`/eco-points/${encodeURIComponent(id)}`, { signal });
}
