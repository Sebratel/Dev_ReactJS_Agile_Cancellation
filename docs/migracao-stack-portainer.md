# Migração da stack no Portainer (staging)

De `agile-cancellation-platform` (compose `docker-compose.yml`, containers `-api`/`-db-1`/`-web`) para
`dev_reactjs_agile_cancellation` (compose `docker-compose.portainer.yml`, serviços `backend`/`mariadb`/`frontend`).

Estado antes: stack id 220 em `servidor-dev-homologação`, Git `Sebratel/Dev_Agile_cancellation` (nome antigo do repositório,
redirecionado), ref `refs/heads/staging`, arquivo `docker-compose.yml` (não existe mais, o Portainer já mostra o erro),
volume `agile-cancellation-platform_db_data` com dados reais desde 11/08.

## Por que o banco não é copiado

O compose aceita `DB_VOLUME_NAME`. Apontando para o volume antigo, o MariaDB novo usa os mesmos dados no mesmo lugar:
não há cópia nem janela de perda. O MariaDB 11.8 abre o diretório de dados do 11.x (mesma série). Sem a variável, o
volume é criado vazio com o nome `dev_reactjs_agile_cancellation_db_data`.

## Passo a passo

1. **Backup (obrigatório).** No container `agile-cancellation-platform-db-1`, aba Console do Portainer:
   `mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --all-databases --single-transaction > /var/lib/mysql/backup-pre-migracao.sql`
   (o arquivo fica no próprio volume; confira o tamanho com `ls -lh`).
2. **Anotar as variáveis da stack antiga** (Environment variables): reutilize os MESMOS valores de
   `MARIADB_ROOT_PASSWORD`, `MARIADB_USER`, `MARIADB_PASSWORD`, `JWT_SECRET` etc. O banco existente foi inicializado com
   as senhas antigas e o MariaDB ignora as variáveis de senha quando o volume já tem dados.
3. **Parar** a stack antiga (Stop this stack). Não usar Delete com "remover volumes".
4. **Criar a nova stack** (Stacks > Add stack > Repository):
   - Name: `dev_reactjs_agile_cancellation`
   - Repository URL: `https://github.com/Sebratel/Dev_ReactJS_Agile_Cancellation`
   - Reference: `refs/heads/staging`
   - Compose path: `docker-compose.portainer.yml`
   - Environment variables: perfil de `deploy/profiles/medium.env`, mais `DB_VOLUME_NAME=agile-cancellation-platform_db_data`,
     `WEB_PORT=8089` (mantém a porta publicada hoje), `CORS_ORIGIN` (URL real do frontend, fora de localhost),
     `JWT_SECRET` (≥ 32 caracteres), `N8N_WEBHOOK_SECRET` (≥ 16) e as senhas do MariaDB do passo 2.
   - Habilitar GitOps updates (webhook) com _Re-pull image_ e _Force redeployment_.
5. **Validar**: containers `dev_reactjs_agile_cancellation-{mariadb,backend,frontend}-1` saudáveis, `curl :4000/health`,
   login e uma consulta com dados antigos.
6. **Remover a stack antiga** (Delete this stack, sem remover volumes) somente depois do passo 5. O volume antigo
   passa a ser usado pela stack nova; não apague.

O Compose pode avisar que o volume existente foi criado por outro projeto; é só aviso, os dados são mantidos.

## Rollback

Parar a stack nova e iniciar a antiga de novo (os containers antigos continuam existindo enquanto não forem removidos).
O volume é o mesmo; se algo tiver gravado dados incompatíveis, restaure `backup-pre-migracao.sql`.
