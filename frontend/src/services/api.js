const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

async function requestData(path, {
  method = 'GET',
  body,
  signal,
} = {}) {
  const headers = {
    Accept: 'application/json',
  };

  const options = {
    method,
    headers,
    signal,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
      'Não foi possível conectar à API. Verifique a conexão e tente novamente.',
    );
  }

  if (response.status === 204 && method === 'DELETE') {
    return undefined;
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

export function getMaterials({ signal } = {}) {
  return requestData('/materials', { signal });
}

export function searchGeocode(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query });

  return requestData(`/geocode/search?${params.toString()}`, { signal });
}

export function reverseGeocode(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });

  return requestData(`/geocode/reverse?${params.toString()}`, { signal });
}

export function createEcoPoint(data, { signal } = {}) {
  return requestData('/eco-points', {
    method: 'POST',
    body: data,
    signal,
  });
}

export function updateEcoPoint(id, data, { signal } = {}) {
  return requestData(`/eco-points/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
    signal,
  });
}

export function deleteEcoPoint(id, { signal } = {}) {
  return requestData(`/eco-points/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  });
}