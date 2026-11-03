# Entregas

## [x] 1. Identificação do casal e navegação principal
- A aplicação deve ser pensada exclusivamente para uso compartilhado entre Douglas (Douglas Alexander) e Bruna (Bruna Toth).
- Não utilizar sistemas complexos de autenticação; disponibilizar um seletor simples de perfil com os nomes Douglas Alexander e Bruna Toth, na tela inicial ou no topo, para identificar quem registra receitas/despesas e quem marca tarefas.
- A interface deve ser limpa, moderna, responsiva e intuitiva, otimizada para computadores e smartphones, com área/aba dedicada às finanças e área/aba dedicada às tarefas.

## [x] 2. Lançamentos e orçamento financeiro
- Permitir registro rápido de receitas e despesas informando valor, data, descrição e vinculação a categorias personalizáveis.
- Permitir definir teto de gastos mensal por categoria e exibir indicadores visuais do quanto foi consumido, quanto resta ou se o orçamento foi excedido.

## [x] 3. Painel, gráficos e insights financeiros
- Exibir resumo financeiro do mês com entradas, saídas e saldo.
- Exibir gráfico de despesas por categoria e gráfico de tendência mês a mês.
- Exibir bloco de insights automáticos em linguagem simples; por exemplo, avisar que uma categoria está acima do orçamento e indicar a variação percentual quando disponível.

## [x] 4. Gestão e conclusão de tarefas
- Oferecer uma área dedicada à gestão de afazeres domésticos diários, semanais e mensais.
- Dividir claramente as atividades por responsável (Douglas, Bruna ou ambos) e por dia/semana.
- Cada tarefa deve ter status interativo, permitindo marcar concluída ou pendente com checkbox.
- Manter visíveis a frequência e o responsável associados a cada atividade.

## [x] 5. Rotina doméstica inicial baseada no documento fornecido
- Configurar sem acrescentar atividades ou inventar dias não indicados no PDF.
- Diárias: Banho dos bebês — Douglas — diário à noite; Trocar bebês pós-banho — Bruna — diário à noite; Separar roupas para o banho — Douglas — diário; Fazer mamá e trocar para creche (manhã) — Douglas — diário; Preparar bolsas e roupas para creche (manhã) — Bruna — diário; Janta dos bebês — Bruna — diário.
- Revezamento noturno: Dormir com os bebês / Fazer mamá da noite — revezamento em dias alternados — preservar a referência “Bruna em 24/09” indicada no documento, sem ano.
- Escala da louça: semana ímpar — Douglas — segunda, quarta, sexta e domingo; semana par — Bruna — terça, quinta, sábado e domingo.
- Limpezas com frequência “Equilibrada”, sem atribuir dias da semana que não constam no documento: Banheiro — Douglas; Quarto dos bebês — Bruna; Quarto PC — Douglas; Cozinha — Bruna; Sala — Douglas; Lavanderia — Bruna; Garagem — Douglas.
- Mensais/ocasionais: Limpar janelas — Douglas — 1x/mês; Limpar paredes mofadas — Douglas — 1x/mês; Roupa de cama dos bebês — Bruna — 1x/mês ou conforme necessidade; Limpeza dos armários da cozinha — Bruna — 1x/mês; Guarda-roupa dos bebês — Douglas limpa e Bruna organiza — 1x/mês; Lavar cortinas — Douglas — 1x/mês.
- Compromisso fixo: Encontro/Tempo do Casal — ambos — sábado às 20:00 — prioridade total.

## [x] 6. Estrutura de código e entrega para GitHub/Vercel
- Manter o código organizado e apto a ser versionado em repositório GitHub e integrado a deploys de produção na Vercel.
- Fornecer comandos/instruções para configurar o email de autoria dos commits como `douglasalexjj@outlook.com.br`, criar/subir o repositório e integrá-lo à Vercel.

## Observação sobre armazenamento
Os dados do casal ficam no `localStorage` do navegador, conforme a configuração do blueprint sem banco de dados. Os dois perfis compartilham o mesmo conjunto de dados naquele navegador. Para transferir entre aparelhos/navegadores, use os botões de backup JSON; sincronização automática em nuvem não está incluída.
