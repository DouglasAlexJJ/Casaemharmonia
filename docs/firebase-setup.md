# Configuração do Firebase

A aplicação está preparada para o projeto Firebase `casaemharmonia-4df2d`, Firebase Authentication com Google e Cloud Firestore. Ela usa configuração de cliente Web; não requer nem deve receber service-account JSON, chave privada ou segredo OAuth.

## 1. App Web e provedor Google

No Firebase Console, abra **Configurações do projeto → Seus apps** e registre um app Web se ainda não existir. Copie `apiKey`, `authDomain`, `projectId`, `appId` e, se aparecer, `messagingSenderId`. Em **Authentication → Sign-in method**, confirme que o provedor Google está ativado.

A `apiKey` Firebase Web é um identificador público do cliente e será incluída no JavaScript do navegador por desenho. A proteção dos registros depende das regras Firestore. Não cole service-account JSON, senha, token ou segredo OAuth no app.

## 2. Substitua imediatamente as regras abertas

As regras temporárias atualmente configuradas permitem leitura e escrita públicas até 3 de dezembro de 2026. Não guarde dados financeiros reais enquanto essa regra estiver publicada. No Firebase Console, abra **Firestore Database → Rules**, substitua todo o conteúdo pelas regras do arquivo [`firestore.rules`](../firestore.rules) e clique **Publish**.

Como alternativa, depois de autenticar no projeto correto com Firebase CLI:

```bash
firebase login
firebase deploy --only firestore:rules --project casaemharmonia-4df2d
```

As regras negam qualquer caminho não explicitamente permitido. Dados compartilhados são acessíveis somente a contas Google autenticadas cujos UIDs estejam marcados como membros ativos. Cada depósito só pode ser gravado/alterado/apagado pela conta que o registrou. Registros individuais são autorizados apenas para o próprio UID, que também precisa ser membro.

## 3. Autorize as duas contas Google

Douglas e Bruna devem abrir a aplicação e entrar com suas próprias contas. Antes de autorizar os UIDs, publique as regras fechadas acima. A tela de acesso aguardando mostra e permite copiar o UID de cada conta; nenhum dado da casa é carregado antes de existir o documento de membro ativo.

No Firebase Console, em **Firestore Database → Data**, crie `households/casaemharmonia/members` e um documento por UID. Se a interface pedir, crie o documento-pai `households/casaemharmonia` com um campo simples, por exemplo `name: "Casa em Harmonia"`; nenhum dado financeiro deve ficar no documento-pai. Os documentos de membro devem ter este formato:

```json
{
  "profile": "Douglas Alexander",
  "active": true
}
```

No documento do outro UID, use `"profile": "Bruna Toth"`. Os nomes aceitos são exatamente `Douglas Alexander` e `Bruna Toth`; somente um administrador do Firebase Console cria/desativa os documentos de membro.

## 4. Variáveis de desenvolvimento e Vercel

Para desenvolvimento, copie `.env.example` para `.env.local` e preencha os campos do app Web. `.env.local` está excluído do Git. O SDK precisa de `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` e `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` se esse campo constar na configuração.

Depois de importar o repositório na Vercel, cadastre essas mesmas variáveis em **Settings → Environment Variables** para Production e Preview e faça deploy. Em **Firebase Authentication → Settings → Authorized domains**, inclua `localhost` e o domínio atribuído pela Vercel; adicione também o domínio de Preview que vocês utilizarem. Se Google Auth abrir dentro de um iframe/Preview, teste em uma aba própria caso o navegador bloqueie a janela de login.

O HTML e a tela de login da Vercel podem ser abertos por visitantes; apenas a leitura e a gravação dos dados estão restritas pelas regras Firestore e pela lista de UIDs ativos. Se quiser restringir também a página do site, habilite **Vercel Deployment Protection**.

## 5. Dados, privacidade e retenção

Salários de referência, depósitos, lançamentos, orçamentos, contas, parcelas compartilhadas e tarefas sincronizam em `households/casaemharmonia/shared`. Dívidas e despesas individuais ficam em `users/{uid}/private/{entryId}`; nenhuma consulta da aplicação lê o caminho privado do outro UID. Os backups JSON incluem somente os dados compartilhados e ainda devem ser tratados como informação financeira privada; por segurança, a importação restaura apenas os depósitos do UID autenticado e o outro membro importa os próprios.

Os dados ficam no projeto Firebase até que sejam removidos pela aplicação ou pelo proprietário no Console; não há prazo automático de expiração. Não colocamos salários, saldos ou dívidas pessoais em `README`, código, `.env.example` ou no commit. O único arquivo local com configuração Firebase é `.env.local`, ignorado pelo Git.

O app registra e calcula somente. A reserva, investimentos e mesadas são projeções configuráveis; não há integração bancária, recomendação de investimento nem movimentação automática de dinheiro.

O lockfile força `@grpc/grpc-js` para `1.13.6`, primeira versão corrigida indicada nos avisos de segurança [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) e [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).

## Referências oficiais

- [Configurar o Firebase em apps Web](https://firebase.google.com/docs/web/setup) — registro do app e inicialização da SDK modular.
- [Login Google para Web](https://firebase.google.com/docs/auth/web/google-signin) — provedor Google e fluxo de autenticação.
- [Introdução à segurança do Firestore](https://firebase.google.com/docs/firestore/security/get-started) e [estrutura das regras](https://firebase.google.com/docs/firestore/security/rules-structure) — autenticação, autorização e negação padrão.
- [Sobre as Firebase API keys](https://firebase.google.com/docs/projects/api-keys) — a chave Web identifica o projeto; os dados devem ser protegidos pelas regras e pelo Authentication.
