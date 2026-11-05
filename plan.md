# Plano de implementação — Casa em Harmonia

## Escopo aprovado

Estender o painel existente de Douglas e Bruna sem perder as rotinas, tarefas, gráficos e lançamentos já configurados. A nova área financeira permitirá que o casal altere no site as rendas de referência, registre os depósitos efetivamente recebidos em cada mês e ajuste percentuais de reserva, investimento e mesada. Salários e dívidas privadas nunca serão gravados no código, em exemplos ou no repositório. O casal preencherá as rendas dentro da área autenticada; mudanças futuras de salário serão simples alterações de configuração. Backups incluem somente os dados compartilhados e não contêm registros privados.

## Design

- **Movimento:** manter o estilo editorial doméstico contemporâneo já aplicado no produto.
- **Princípios:** informação financeira legível; estimativas distintas de valores efetivamente depositados/pagos; edição rápida; privacidade claramente indicada.
- **Cores:** usar azul-marinho e azuis frios como identidade financeira, com fundos claros e neutros para leitura, areia para planejamento e terracota para alertas; remover a paleta verde; estados privados recebem rótulo próprio sem revelar dados a outro perfil.
- **Layout:** manter navegação lateral no desktop e navegação móvel, com subáreas para Resumo, Planejamento, Contas e Dívidas e Área privada.
- **Elementos de assinatura:** cartões serenos com percentuais e progresso; marca da casa existente; chips claros para previsto, pago e privado.
- **Interações:** formulários curtos com salvamento explícito e feedback; alterações nos percentuais recalculam o saldo imediatamente; campos estimados e depósitos reais permanecem distinguíveis.
- **Animação:** transições discretas de entrada/estado, sem animação contínua nos gráficos ou números.
- **Tipografia:** conservar DM Sans para controles e dados e DM Serif Display para títulos editoriais já existentes.
- **Essência da marca:** um espaço calmo para planejar a casa e acompanhar dinheiro junto; acolhedor, claro e confiável.
- **Voz:** mensagens diretas e tranquilas, por exemplo “Registre o que caiu na conta” e “Sua mesada estimada muda quando as contas forem confirmadas”.
- **Marca:** conservar o símbolo de casa e o wordmark já implementados.
- **Cor proprietária:** azul-marinho `#17365d`, para transmitir estabilidade, organização e confiança financeira.

## Arquitetura e comportamento

- Manter Next.js App Router, React e TypeScript; acrescentar o SDK modular `firebase` para Auth e Cloud Firestore. A configuração do app Web fica em variáveis `NEXT_PUBLIC_FIREBASE_*`; não incluir credenciais de service account, tokens nem `.env.local` no repositório.
- Usar Firebase Authentication com Google, conforme autorização do usuário. O UID autenticado identifica o responsável e substitui a seleção livre de perfil para registros protegidos. A interface exibe o nome do perfil correspondente ao membro autenticado.
- Usar o Firestore no projeto `casaemharmonia-4df2d`. A aplicação apresenta estado de configuração pendente quando as variáveis Web ainda não estão completas e estado de “aguardando autorização” para conta autenticada cujo UID ainda não está cadastrado como membro.
- Armazenar dados compartilhados em `households/casaemharmonia/shared/...`; armazenar dados pessoais em `users/{uid}/private/...`. As regras negam tudo por padrão, liberam dados compartilhados somente a UIDs com documento em `households/casaemharmonia/members/{uid}` e limitam dados privados ao próprio UID, que também precisa ser membro. As regras nunca liberam acesso anônimo. Os documentos de membros serão criados pelo usuário no Firebase Console após cada pessoa fazer login; nenhum email/UID será gravado no código-fonte.
- Conservar exportação/backup e importação explícita somente para dados compartilhados. Não incluir dívidas ou despesas privadas em backup compartilhado nem manter registros privados no estado sincronizado da casa. Não migrar dados locais para a nuvem sem confirmação explícita na interface.
- Modelo financeiro: rendas de referência editáveis por pessoa, usadas somente para investimentos; percentuais editáveis para reserva de emergência e investimentos; a reserva incide sobre depósitos reais do mês; investimentos incidem sobre a soma das rendas de referência; meta/saldo atual da reserva editáveis; depósitos reais por pessoa e por mês; contas fixas e variáveis com previsão, vencimento, status e valor efetivamente pago; dívidas compartilhadas com saldo/parcela; mesadas proporcionais ao valor restante após reservar e deduzir contas e dívidas compartilhadas. A divisão inicial será igual (50%/50%) porque o casal pediu mesadas iguais, mas as duas participações poderão ser ajustadas e totalizarão 100%. Dívidas privadas serão pagas a partir da mesada do próprio titular e não reduzirão a mesada do outro.
- O cálculo mostrará projeção enquanto houver valores previstos e saldo/mesada recalculados conforme depósitos e pagamentos reais forem registrados. Gastos variáveis como luz, água, internet, gasolina e faculdade terão estimativa mensal e valor real editáveis. Aluguel, carro e dívidas compartilhadas serão configuráveis como compromissos da casa. Cartões permanecem marcados como bloqueados; não haverá fluxo de compra ou integração financeira.
- Nenhuma transferência, investimento, débito bancário ou pagamento será executado pelo app. Ele registra valores informados pelo casal e faz cálculos de planejamento.

## Estrutura principal

- `src/app/`: layout, página, estilos e manifesto de rotas.
- `src/components/household-app.tsx`: estado de autenticação, status de sincronização, navegação e limites de dados compartilhados/privados.
- `src/components/finance-view.tsx`: resumo, lançamentos, categorias, gráficos e insights existentes.
- `src/components/finance-planning-view.tsx`: salários, depósitos reais, percentuais, reserva, contas, dívidas compartilhadas e mesadas.
- `src/components/private-finance-view.tsx`: dívidas e despesas privadas do usuário autenticado.
- `src/lib/household.ts`: tipos, valores iniciais editáveis, validação e cálculos puros de orçamento.
- `src/lib/firebase.ts`: inicialização client-side de Firebase Auth e Firestore.
- `src/lib/firestore-repository.ts`: operações e assinaturas em tempo real para documentos compartilhados e particulares.
- `firestore.rules` e `firebase.json`: regras e declaração versionadas; publicação das regras ocorre no projeto do usuário por Firebase Console/CLI.
- `.env.example` e `docs/firebase-setup.md`: nomes de variáveis, configuração do app Web, entrada dos dois UIDs e orientação de deploy.
- `README.md`: instalação, configuração Firebase, segurança, push ao repositório GitHub indicado e posterior importação manual na Vercel.

## Limites de integração

O usuário confirmou o ID do projeto, informou a configuração do app Web e habilitou o provedor Google. O Preview local usa essa configuração somente em `.env.local`, ignorado pelo Git. Depois do push, o usuário adicionará os valores Web na Vercel, publicará as regras e cadastrará os dois documentos de membro no Firebase Console; os passos estão na documentação. O repositório de destino informado é `https://github.com/DouglasAlexJJ/Casaemharmonia`. Não criar nem configurar o projeto Vercel, pois o usuário fará essa etapa depois do push.
