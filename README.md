# Casa em Harmonia

Aplicação responsiva Next.js/React para finanças e rotina da casa de Douglas Alexander e Bruna Toth. Usa login Google, Firebase Authentication e Cloud Firestore para sincronizar dados entre computadores autorizados. A tela não oferece fluxo de pagamento, transferência ou investimento automático.

A identidade visual usa azul-marinho e tons frios de azul, com uma apresentação financeira sóbria; o verde foi removido da paleta do site.

## Desenvolvimento local

Requisitos: Node.js 20+ e pnpm 11.25.0 (fixado em `package.json`).

```bash
pnpm install
cp .env.example .env.local
# Preencha .env.local com a configuração do app Web Firebase
pnpm dev
```

Abra `http://localhost:3000`. Para conferir os tipos e produzir uma build:

```bash
pnpm typecheck
pnpm build
pnpm start
```

Consulte [`docs/firebase-setup.md`](docs/firebase-setup.md) para registrar o app Web, publicar regras restritivas, autorizar os dois UIDs e preparar o deploy. O `.env.local` fica ignorado pelo Git; nunca adicione nele uma service account.

## Modelo financeiro

As rendas de referência para investimento são configuradas e alteradas pela área autenticada, não por constantes do código. Apenas os investimentos usam a soma dessas rendas de referência. A reserva de emergência é percentual dos depósitos reais do mês; o saldo atual e a meta são editáveis.

A cada mês, cada pessoa registra o valor efetivamente depositado. A estimativa de mesadas parte dos depósitos registrados, separa reserva e investimentos, desconta as contas e parcelas compartilhadas e divide o restante pelos percentuais ajustáveis (início igualitário). Contas ainda não marcadas como pagas usam o valor previsto; parcelas individuais reduzem apenas a mesada da própria pessoa. Quando um dos depósitos não foi informado, o painel sinaliza que o cálculo está incompleto. O app só calcula e registra; não movimenta dinheiro nem valida saldo bancário.

## Firebase e segurança

- Somente uma conta Google autenticada cujo UID tenha documento ativo em `households/casaemharmonia/members/{uid}` acessa os dados compartilhados.
- Salários de referência, depósitos, lançamentos, orçamentos, contas, pagamentos compartilhados e tarefas sincronizam em `households/casaemharmonia/shared`.
- Despesas e dívidas individuais ficam em `users/{uid}/private/{entryId}` e são lidas apenas pelo próprio UID membro.
- `firestore.rules` nega acesso por padrão; os documentos de membro são criados no Firebase Console pelo titular do projeto, não pelo cliente.
- Dados permanecem no projeto Firebase até serem apagados pela aplicação ou pelo proprietário do projeto. Os backups JSON contêm somente os dados compartilhados; a importação de depósitos restaura apenas os que pertencem ao UID autenticado, e o outro membro deve restaurar os seus. Trate o arquivo como informação financeira privada.
- O endereço do site e a tela de login podem ser acessíveis publicamente na Vercel. A autenticação e as regras protegem os dados; para restringir também a própria página, configure Vercel Deployment Protection após criar o projeto.
- A configuração Firebase Web (API key, auth domain, project ID e app ID) é de cliente e aparece no JavaScript do navegador por desenho. Ela não substitui regras de acesso. Não versionamos `.env.local` nem credenciais administrativas.

## Repositório GitHub

O repositório solicitado é `https://github.com/DouglasAlexJJ/Casaemharmonia`. Para novos commits, configure a autoria **localmente neste repositório**:

```bash
git config user.name "Douglas Alexander"
git config user.email "douglasalexjj@outlook.com.br"
```

A partir deste workspace, se o remoto `github` ainda não existir:

```bash
git remote add github https://github.com/DouglasAlexJJ/Casaemharmonia.git
git fetch github
git push -u github main
```

Em um clone feito diretamente do repositório, `origin` já aponta para o GitHub; use `git push -u origin main`. O email não altera a configuração Git global. Não envie `.env.local`, `node_modules` nem `.next`.

## Deploy na Vercel (após o push)

1. Na Vercel, escolha **Add New → Project → Import Git Repository** e selecione `DouglasAlexJJ/Casaemharmonia`.
2. Mantenha o preset **Next.js** e os comandos padrão de instalação/build. A Vercel detecta o `pnpm-lock.yaml` e executa a build.
3. Em **Settings → Environment Variables**, cadastre as variáveis `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` e, se fornecida, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`. Use os valores do app Web no Firebase Console e aplique-os a Production e Preview.
4. Faça o primeiro deploy e adicione o domínio Vercel em **Firebase Authentication → Settings → Authorized domains**; depois faça redeploy.
5. Cada push em `main` gera novo deploy de produção. Ative Vercel Deployment Protection se também quiser esconder a própria página de visitantes.

O projeto Vercel não é criado automaticamente por este repositório; a importação e a política de acesso do site ficam sob controle do casal.
