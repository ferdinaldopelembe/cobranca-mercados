import Constants from "expo-constants";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (!hostUri) {
    throw new Error(
      "Não foi possível detectar o endereço do Expo Go. Abra a app através do servidor Expo."
    );
  }

  const host = hostUri.startsWith("[")
    ? hostUri.slice(0, hostUri.indexOf("]") + 1)
    : hostUri.split(":")[0];

  if (!host) {
    throw new Error("O endereço de rede do Expo Go é inválido.");
  }

  return `http://${host}:8080/api`;
}

export async function api(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const headers = { ...options.headers };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Não foi possível ligar à API em ${baseUrl}. Confirme que o backend está em execução e que o telefone e o computador estão na mesma rede.`,
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
    throw new ApiError(
      body?.detail ||
        body?.message ||
        messageForStatus(response.status),
      response.status
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
