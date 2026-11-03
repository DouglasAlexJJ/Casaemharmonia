# Casa em Harmonia

Painel responsivo para Douglas Alexander e Bruna Toth acompanharem finanças da casa e a rotina doméstica. O app usa Next.js, React e TypeScript; não exige conta, senha, API key, serviço de autenticação ou banco de dados.

## Rodar localmente

Requisitos: Node.js 20+ e pnpm 11.25.0 (fixado no `package.json`). Na raiz do projeto:

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Para conferir os tipos e gerar a build de produção:

```bash
pnpm typecheck
pnpm build
pnpm start
```

## Dados e privacidade

Os lançamentos financeiros, categorias, orçamentos, perfil ativo e conclusões das tarefas são salvos em `localStorage` no navegador. Os perfis Douglas e Bruna alternam a identificação dos registros nesse mesmo conjunto local. A aplicação não sincroniza automaticamente entre dispositivos ou navegadores; use **Exportar backup** e **Importar** para transferir um arquivo JSON manualmente. Trate o arquivo de backup como informação privada. A primeira configuração contém a rotina recebida e categorias financeiras editáveis, mas não inclui lançamentos ou valores de orçamento fictícios.

## GitHub: criar um repositório e publicar o código

Crie um repositório **privado** no GitHub (ou use GitHub CLI já autenticado). Ao exportar este projeto para uma pasta nova, não inclua `.git`, `node_modules` nem `.next`; mantenha `pnpm-lock.yaml` se já existir. Na pasta limpa do projeto:

```bash
git init -b main
git config user.name "Douglas Alexander"
git config user.email "douglasalexjj@outlook.com.br"
git add -A
git commit -m "feat: inicializa painel da casa"
gh repo create duobruna-casa-financas --private --source=. --remote=origin --push
```

`gh repo create` requer o GitHub CLI instalado e autenticado anteriormente (`gh auth login`) ou a criação manual do repositório privado no GitHub. Se criado manualmente, associe o endereço mostrado pelo GitHub e envie:

```bash
git remote add origin https://github.com/SEU_USUARIO/duobruna-casa-financas.git
git push -u origin main
```

O email acima fica na configuração **local do repositório**; assim os commits do Douglas têm a autoria solicitada sem alterar a configuração Git global da máquina.

## Vercel: integração contínua

1. Entre na Vercel e escolha **Add New → Project → Import Git Repository**.
2. Conecte o GitHub, selecione `duobruna-casa-financas` e importe o projeto.
3. Confirme o preset **Next.js** e mantenha os comandos padrão de instalação/build. O deploy deve usar `pnpm install` e `pnpm build`; a Vercel detecta o diretório de saída Next.js automaticamente.
4. Selecione **Deploy**. Cada push em `main` gera um deploy de produção; branches e pull requests podem gerar previews.

Nenhuma variável de ambiente é necessária nesta versão.
