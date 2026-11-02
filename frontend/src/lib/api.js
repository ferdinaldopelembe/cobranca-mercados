export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Não foi possível ligar à API. Confirme se o backend está em execução na porta 8080.",
        { cause: error }
      );
    }
    throw error;
  }
  if (response.status === 204) return null;

  const responseText = await response.text();
  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error("Não foi possível concluir o pedido. Tente novamente.");
      }
    }
  }
  if (!response.ok) {
    throw new Error(
      body?.detail
      || body?.message
      || messageForStatus(response.status)
    );
  }
  return body;
}

function messageForStatus(status) {
  if (status === 400) return "Alguns dados não foram aceites. Verifique as informações e tente novamente.";
  if (status === 401) return "A sua sessão terminou. Entre novamente para continuar.";
  if (status === 403) return "Não tem autorização para realizar esta operação.";
  if (status === 404) return "Não encontrámos a informação solicitada. Actualize a página e tente novamente.";
  if (status === 409) return "Não foi possível concluir porque já existe uma situação incompatível. Verifique os dados e tente novamente.";
  if (status === 429) return "Foram feitas demasiadas tentativas. Aguarde um pouco e tente novamente.";
  if (status >= 500) return "Ocorreu um problema ao processar o pedido. Tente novamente dentro de momentos.";
  return "Não foi possível concluir o pedido. Tente novamente.";
}

export function apiPost(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut(path, body) {
  return api(path, { method: "PUT", body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return api(path, { method: "PATCH", body: JSON.stringify(body) });
}
