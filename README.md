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

O administrador pode criar e eliminar contas de **Fiscal** e **Gestor Financeiro** em *Utilizadores*. A palavra-passe inicial precisa de pelo menos 12 caracteres; fiscais têm de ser associados a um mercado, enquanto o mercado do gestor é opcional. Cada utilizador entra com o e-mail ou telefone e a palavra-passe definidos pelo administrador. Contas associadas como responsáveis por pagamentos não podem ser eliminadas, para preservar o histórico financeiro.

Para acrescentar dados demonstrativos à mesma base persistente usada pela aplicação, active o seeder no arranque. Os dados reais existentes são preservados; os registos criados ficam identificados com `[DEMO]` nos nomes e com `DEMO-` nas referências. Nenhuma senha demonstrativa é marcada como paga e nenhuma receita real é criada. Como partilham a base, estes registos aparecem juntamente com os restantes e devem ser reconhecidos pelo identificador `[DEMO]`.

```powershell
$projectRoot = (Get-Location).Path
$database = Join-Path $projectRoot "backend\data\cobranca"
$env:COBRANCA_DB_URL = "jdbc:h2:file:$($database.Replace('\', '/'));DB_CLOSE_ON_EXIT=FALSE"
$env:COBRANCA_DEMO_DATA = "true"
$env:COBRANCA_DEMO_PASSWORD = "DemoMerchant-Beira-2026!"
Set-Location (Join-Path $projectRoot "backend")
.\mvnw.cmd spring-boot:run
```

O seeder é idempotente: pode arrancar novamente sem duplicar os 12 comerciantes e 48 registos históricos (36 expirados e 12 pendentes). Os comerciantes usam e-mails `demo.comerciante.01@exemplo.test` a `demo.comerciante.12@exemplo.test` e a palavra-passe `DemoMerchant-Beira-2026!`. O acesso administrativo e a palavra-passe já existentes não são alterados. Faça uma cópia de segurança antes de activar a carga num ambiente que contenha dados operacionais.

Inicie o frontend apontando o proxy para a API na porta normal:

```powershell
$env:VITE_API_PROXY_TARGET = "http://localhost:8080"
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Os dados demonstrativos não são carregados por omissão. Para os acrescentar, configure `COBRANCA_DB_URL` para a base original `backend/data/cobranca` como no exemplo; não use `cobranca-demo` nem outra localização quando quiser manter tudo na base original.

O Comerciante entra com telefone ou e-mail e começa num painel próprio, adaptado a telemóvel, com a taxa do seu negócio, periodicidade, valores pendentes, senhas expiradas, pagamentos confirmados, notificações e situação da conta. Pode gerar e consultar senhas com referência e QR Code, ver o histórico e descarregar recibos PDF de pagamentos confirmados. Os dados financeiros apresentados são limitados à sua conta. M-Pesa, e-Mola e Mkesh estão disponíveis como simulação local: o comerciante informa o telefone, emite uma senha pendente e escolhe um resultado simulado (confirmação, rejeição ou falta de resposta). A simulação não transfere dinheiro e nunca solicita PIN.

O fluxo de numerário é separado em três passos: o comerciante emite uma senha; o fiscal do mercado regista o dinheiro recebido; e um Gestor Financeiro diferente confirma ou rejeita o registo. O comerciante não pode registar recebimentos, aprovar pagamentos, validar senhas como fiscal, criar mercados ou definir taxas. Só pagamentos confirmados geram recibo e entram na receita; o gestor também pode consultar relatórios apenas do mercado atribuído (ou todos, se não houver mercado associado). Senhas por pagar expiram em 48 horas por omissão; o administrador pode alterar a validade em *Configurações* (1–720 horas). A aplicação avisa antes da expiração e notifica a expiração e o bloqueio. Após mais de três senhas expiradas, o comerciante é impedido de gerar novas senhas, mas continua a poder entrar para consultar o motivo, as pendências e o histórico; a regularização manual é auditada e inicia uma nova contagem, sem apagar senhas anteriores.

## Aplicação móvel (Expo Go)

A aplicação móvel React Native está em `mobile/` e usa Expo SDK 58. Inicie o backend na raiz do projecto, como descrito acima, e aguarde por `Started CobrancaApplication`. Depois, num segundo terminal:

```powershell
cd mobile
npm.cmd install
npx.cmd expo start
```

Abra o projecto com o Expo Go. O telemóvel e o computador que executa o backend devem estar ligados à mesma rede Wi-Fi; permita ligações de entrada na porta `8080` na firewall do computador. A app detecta o endereço de rede anunciado pelo Expo Go e usa esse mesmo IP para as chamadas à API, sem configuração manual quando o IP da rede muda. O backend continua a usar a porta `8080`. Não use `localhost` no telemóvel: esse endereço apontaria para o próprio dispositivo.

A app móvel partilha a API, as contas e os dados com o frontend web. Inclui os fluxos de autenticação, pagamentos e recibos, dashboard, mercados e bancas, comerciantes, taxas, fiscais, utilizadores de equipa, relatórios, auditoria, notificações e configurações.

## Persistência e configuração

- A base de dados H2 fica em `backend/data/cobranca.mv.db`, independentemente de a API ser iniciada na raiz do projecto ou na pasta `backend`. O ficheiro é ignorado pelo Git para manter os dados locais fora do repositório. Pare a API antes de copiar esse ficheiro para uma cópia de segurança.
- A aplicação inicializa exemplos de mercados, bancas e taxas. Confirme e substitua estes dados pelos dados oficiais antes de utilização operacional.
- `COBRANCA_CORS_ORIGINS` define as origens permitidas, separadas por vírgulas. O valor local por omissão permite Vite em `localhost:5173` e `127.0.0.1:5173`.
- Em HTTPS, defina `COBRANCA_COOKIE_SECURE=true`. Não exponha a API nem o H2 a redes públicas sem HTTPS, cópias de segurança e uma configuração de produção adequada.
- H2 em ficheiro destina-se a uma instalação de instância única; não é uma configuração de alta disponibilidade nem adequada a várias instâncias concorrentes.

## Limites funcionais importantes

Os pagamentos em numerário, as transacções simuladas de carteira móvel e notificações internas são persistidos pela API; notificações podem ser marcadas como lidas. Recibos PDF só ficam disponíveis depois da confirmação do pagamento e podem ser consultados e descarregados. A simulação de carteira móvel não substitui integração nem confirmação de liquidação por M-Pesa, e-Mola ou Mkesh; POS continua indisponível. Notificações por e-mail/SMS e 2FA não estão configuradas. A autenticação existente utiliza sessões HTTP protegidas por cookie, não JWT.

## Validação

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
cd ..\backend
.\mvnw.cmd clean test
```
