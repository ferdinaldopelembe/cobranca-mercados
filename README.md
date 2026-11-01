# Cobrança de Mercados

Aplicação web para gestão de mercados, comerciantes e pagamentos, com frontend React/Vite e API Spring Boot. O backend usa H2 em ficheiro para manter os dados entre reinícios.

## Requisitos

- JDK 17 ou superior (o projeto compila para Java 17)
- Node.js e npm

## Executar localmente

Na primeira inicialização, configure a conta administrativa no PowerShell. A palavra-passe deve ter pelo menos 12 caracteres:

```powershell
$env:COBRANCA_ADMIN_EMAIL = "admin@beira.gov.mz"
$env:COBRANCA_ADMIN_PASSWORD = "defina-uma-palavra-passe-forte"
.\backend\mvnw.cmd spring-boot:run
```

No CMD, defina as variáveis e inicie o backend na mesma janela:

```cmd
set "COBRANCA_ADMIN_EMAIL=admin@beira.gov.mz"
set "COBRANCA_ADMIN_PASSWORD=defina-uma-palavra-passe-forte"
backend\mvnw.cmd spring-boot:run
```

Execute estes comandos na raiz do projecto. O backend usa sempre `backend/data/cobranca.mv.db`, mesmo se for iniciado a partir da raiz ou da pasta `backend`. Para escolher outra localização, configure `COBRANCA_DB_URL`. Se o backend já tiver terminado com erro por falta de palavra-passe, defina as variáveis e execute novamente o comando `spring-boot:run`. Aguarde a mensagem `Started CobrancaApplication` antes de abrir o frontend. A mensagem de sucesso no arranque é importante: sem ela, o login não consegue chegar à API.

Inicie o frontend num segundo terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abra `http://localhost:5173`. Comerciantes podem criar a própria conta no ecrã de registo; o administrador usa o e-mail e a palavra-passe configurados acima. A conta administrativa é criada apenas se ainda não existir; alterar as variáveis de ambiente depois não altera o e-mail ou a palavra-passe de uma conta já criada.

## Aplicação móvel (Expo Go)

A aplicação móvel React Native está em `mobile/` e usa Expo SDK 58. Inicie o backend na raiz do projecto, como descrito acima, e aguarde por `Started CobrancaApplication`. Depois, num segundo terminal:

```powershell
cd mobile
npm.cmd install
npx.cmd expo start
```

Abra o projecto com o Expo Go. O telemóvel e o computador que executa o backend devem estar ligados à mesma rede Wi-Fi; permita ligações de entrada na porta `8080` na firewall do computador. A app detecta o endereço de rede anunciado pelo Expo Go e usa esse mesmo IP para as chamadas à API, sem configuração manual quando o IP da rede muda. O backend continua a usar a porta `8080`. Não use `localhost` no telemóvel: esse endereço apontaria para o próprio dispositivo.

A app móvel partilha a API, as contas e os dados com o frontend web. Inclui os fluxos de autenticação, pagamentos e recibos, dashboard, mercados e bancas, comerciantes, taxas, fiscais, relatórios, auditoria e configurações.

## Persistência e configuração

- A base de dados H2 fica em `backend/data/cobranca.mv.db`, independentemente de a API ser iniciada na raiz do projecto ou na pasta `backend`. O ficheiro é ignorado pelo Git para manter os dados locais fora do repositório. Pare a API antes de copiar esse ficheiro para uma cópia de segurança.
- A aplicação inicializa exemplos de mercados, bancas e taxas. Confirme e substitua estes dados pelos dados oficiais antes de utilização operacional.
- `COBRANCA_CORS_ORIGINS` define as origens permitidas, separadas por vírgulas. O valor local por omissão permite Vite em `localhost:5173` e `127.0.0.1:5173`.
- Em HTTPS, defina `COBRANCA_COOKIE_SECURE=true`. Não exponha a API nem o H2 a redes públicas sem HTTPS, cópias de segurança e uma configuração de produção adequada.
- H2 em ficheiro destina-se a uma instalação de instância única; não é uma configuração de alta disponibilidade nem adequada a várias instâncias concorrentes.

## Limites funcionais importantes

Os pagamentos em numerário são persistidos pela API e os recibos podem ser impressos. Métodos electrónicos (M-Pesa, e-Mola, Mkesh e POS) estão desactivados até existir uma integração que confirme a liquidação; a API também rejeita esses métodos. Notificações por e-mail/SMS e 2FA não estão configuradas.

## Validação

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
cd ..\backend
.\mvnw.cmd clean test
```
