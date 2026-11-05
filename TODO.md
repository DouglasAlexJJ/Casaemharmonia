# Entregas

## [x] 1. Identificação do casal e navegação principal
- A aplicação deve ser pensada exclusivamente para uso compartilhado entre Douglas (Douglas Alexander) e Bruna (Bruna Toth).
- Usar Firebase Authentication com Google, conforme autorizado depois; mapear cada UID para o perfil Douglas Alexander ou Bruna Toth, sem seletor livre que permita alterar a identidade usada para acesso privado.
- A interface deve ser limpa, moderna, responsiva e intuitiva, otimizada para computadores e smartphones, com área/aba dedicada às finanças e área/aba dedicada às tarefas.

## [x] 2. Lançamentos e orçamento financeiro existentes
- Permitir registro rápido de receitas e despesas informando valor, data, descrição e vinculação a categorias personalizáveis.
- Permitir definir teto de gastos mensal por categoria e exibir indicadores visuais do quanto foi consumido, quanto resta ou se o orçamento foi excedido.

## [x] 3. Painel, gráficos e insights financeiros existentes
- Exibir resumo financeiro do mês com entradas, saídas e saldo.
- Exibir gráfico de despesas por categoria e gráfico de tendência mês a mês.
- Exibir bloco de insights automáticos em linguagem simples; por exemplo, avisar que uma categoria está acima do orçamento e indicar a variação percentual quando disponível.

## [x] 4. Gestão e conclusão de tarefas
- Oferecer uma área dedicada à gestão de afazeres domésticos diários, semanais e mensais.
- Dividir claramente as atividades por responsável (Douglas, Bruna ou ambos) e por dia/semana.
- Cada tarefa deve ter status interativo, permitindo marcar concluída ou pendente com checkbox.
- Manter visíveis a frequência e o responsável associados a cada atividade.

## [x] 5. Rotina doméstica inicial baseada no documento fornecido
- Configurar as atividades do documento e aplicar atualizações posteriores específicas do usuário como substituições das regras anteriores; não acrescentar tarefas.
- Diárias: Banho dos bebês — Douglas — diário à noite; Trocar bebês pós-banho — Bruna — diário à noite; Separar roupas para o banho — Douglas — diário; Fazer mamá e trocar para creche (manhã) — Douglas — diário; Preparar bolsas e roupas para creche (manhã) — Bruna — diário; Janta dos bebês — Bruna — diário.
- Revezamento noturno: Dormir com os bebês / Fazer mamá da noite — revezamento em dias alternados — preservar a referência “Bruna em 24/09” indicada no documento, sem ano.
- Escala da louça (atualização posterior do usuário): alternância diária — Douglas em 04/11/2026 e Bruna em 05/11/2026; continuar alternando a cada dia. Esta regra substitui a escala semanal ímpar/par do documento.
- Limpezas (atualização posterior do usuário): às quartas e sextas — Banheiro, Quarto PC, Sala e Garagem — Douglas; Quarto dos bebês, Cozinha e Lavanderia — Bruna. Esta programação substitui a frequência “Equilibrada” do documento.
- Mensais/ocasionais: Limpar janelas — Douglas — 1x/mês; Limpar paredes mofadas — Douglas — 1x/mês; Roupa de cama dos bebês — Bruna — 1x/mês ou conforme necessidade; Limpeza dos armários da cozinha — Bruna — 1x/mês; Guarda-roupa dos bebês — Douglas limpa e Bruna organiza — 1x/mês; Lavar cortinas — Douglas — 1x/mês.
- Compromisso fixo: Encontro/Tempo do Casal — ambos — sábado às 20:00 — prioridade total.

## [x] 6. Estrutura de código e entrega inicialmente documentada
- Manter o código organizado e apto a ser versionado em repositório GitHub e integrado a deploys de produção na Vercel.
- Fornecer comandos/instruções para configurar o email de autoria dos commits como `douglasalexjj@outlook.com.br`, criar/subir o repositório e integrá-lo à Vercel.

## [x] 7. Planejamento de renda, reserva, investimentos e mesadas configuráveis
- Permitir cadastrar salários de referência por pessoa no site; os valores atuais informados pelo casal serão adicionados na área autenticada, nunca gravados como constantes do código ou em exemplos versionados. Alterações salariais futuras devem ser possíveis sem modificar código.
- Registrar separadamente, por pessoa e por mês, o valor realmente depositado na conta.
- Permitir configurar dentro do site, em porcentagens, quanto separar para reserva de emergência e investimentos; calcular a reserva sobre os depósitos reais do mês e investimentos sobre as rendas de referência editáveis.
- Permitir definir saldo atual e meta da reserva de emergência.
- Calcular mesadas como percentuais editáveis do valor que restar depois da reserva/investimentos, das contas compartilhadas e das dívidas compartilhadas. Iniciar com divisão igual de 50% para Douglas e 50% para Bruna, com possibilidade de ajuste.
- Mostrar projeção com valores previstos e atualizar a mesada disponível conforme forem registrados os depósitos e pagamentos reais.

## [x] 8. Contas compartilhadas, despesas variáveis, dívidas e cartões
- Permitir cadastrar, alterar e remover contas fixas, como aluguel e carro, e despesas variáveis, como luz, água, internet, gasolina, faculdade e outras que o casal informar.
- Para cada conta, permitir valor previsto, valor pago, vencimento e status de pagamento.
- Permitir cadastrar dívidas compartilhadas informadas pelo casal, com saldo, parcela e vencimento; abatê-las do saldo da casa antes de calcular mesadas.
- Tratar cartões de crédito como bloqueados/não utilizados; não adicionar integração de pagamento ou transação por cartão.

## [x] 9. Área individual privada
- Criar aba de gastos/dívidas individuais privados.
- Dívidas e despesas pessoais do Douglas são pagas pela mesada dele; dívidas e despesas pessoais da Bruna são pagas pela mesada dela; não deduzir dívida privada de um da mesada do outro.
- Cada pessoa pode ler e alterar somente os próprios registros privados; os detalhes de dívidas privadas não devem ser enviados ao estado ou backup compartilhado da casa.

## [ ] 10. Firebase para autenticação, regras de acesso e sincronização
- Usar Firebase Authentication com Google e Cloud Firestore no projeto informado pelo usuário, com acesso aos mesmos dados compartilhados de diferentes computadores.
- Sincronizar dados comuns da casa somente para UIDs autenticados cadastrados como membros autorizados.
- Guardar dívidas/despesas privadas em caminhos individuais e impor em Firestore Rules que somente o UID proprietário possa ler ou alterar esses dados.
- Se o login Google via popup ou redirecionamento falhar sem autenticar a conta, manter a mensagem de erro visível na tela de entrada; para códigos não mapeados, exibir o código Firebase sem expor tokens ou dados sensíveis.
- Substituir a regra temporária que permite leitura e escrita públicas por regras sem acesso anônimo e com negação por padrão.
- Fornecer o arquivo de regras e instruções claras para publicar as regras, registrar o app Web, preencher variáveis de ambiente e cadastrar os dois UIDs no Firestore Console.
- O código, `firestore.rules` e o guia de configuração estão preparados; publicar as regras no Firebase e cadastrar os dois UIDs ainda dependem do titular do projeto.

## [x] 11. Push para o repositório indicado e preparação para Vercel
- Enviar o commit atualizado ao repositório existente `https://github.com/DouglasAlexJJ/Casaemharmonia`, preservando a história remota e sem sobrescrever arquivos não relacionados.
- Usar o email de autoria Git `douglasalexjj@outlook.com.br`.
- Deixar instruções para configurar as variáveis do Firebase e importar o repositório na Vercel; não criar o projeto Vercel, pois o usuário fará essa etapa após o push.

## [x] 14. Configurações financeiras, lançamentos recebidos e conferência da reserva
- A área atualmente apresentada como Planejamento deve ser apresentada como **Configurações** e reunir os salários brutos de Douglas e Bruna e os percentuais configuráveis para reserva de emergência e investimentos.
- Com base no salário bruto e nos percentuais configurados, calcular quanto se recomenda guardar para a reserva de emergência e quanto se destina a investimentos.
- A recomendação da reserva de emergência não pode ser descontada do valor do salário nem do valor disponível; deve permanecer como sugestão separada.
- A área **Entrada real** deve funcionar como lançador dos pagamentos recebidos, permitir vários lançamentos e apresentar o histórico de lançamentos.
- Permitir editar e excluir lançamentos de pagamentos já realizados; cada perfil só pode alterar seus próprios lançamentos.
- O saldo da reserva deve ser formado pelos aportes efetivamente lançados, sem substituir o valor recomendado por aportes fictícios.
- Ao lançar um aporte à reserva, solicitar o valor depositado e o saldo atual da reserva informado pelo banco.
- No fechamento de cada mês, apresentar comparativo entre o total efetivamente depositado na reserva e o saldo informado pelo banco, mostrando a diferença (incluindo juros/rendimentos).

## [x] 12. Paleta azul-marinho
- Remover o verde da identidade visual do site e aplicar azul-marinho/azuis frios em estilo financeiro, preservando tons neutros e cores semânticas de alerta.
- Atualizar os símbolos de marca exibidos pelo site para corresponder à paleta azul-marinho.


## [ ] 13. Nome do site e rotina atualizada
## [x] 13. Nome do site e rotina atualizada
- Alterar o nome exibido no site para **Tarefas e Financeiro B&D**. A mudança é apenas visual no site; não renomear o projeto Firebase, o caminho `households/casaemharmonia`, o repositório GitHub nem outros identificadores técnicos existentes.
- Substituir a escala semanal da louça por alternância diária: Douglas em 04/11/2026 e Bruna em 05/11/2026; continuar alternando um dia para cada pessoa. Mostrar uma tarefa de louça por data nas visões diária e semanal e salvar o check separadamente para cada dia.
- Agendar todas as limpezas abaixo às quartas e sextas. Douglas: Limpeza: Banheiro; Limpeza: Quarto PC; Limpeza: Sala; Limpeza: Garagem. Bruna: Limpeza: Quarto dos bebês; Limpeza: Cozinha; Limpeza: Lavanderia. Mostrar cada item como tarefa marcável nas visões diária e semanal nas quartas e sextas; não o incluir nas tarefas do dia nos outros dias.
