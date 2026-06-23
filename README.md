# Cotamiles v6 — Firebase + Google Auth

Arquivos principais para substituir no GitHub Pages:

- `index.html`
- `funcoes.js`
- `firebase-config.js`
- `service-worker.js` (recomendado para evitar cache antigo do PWA)

## O que mudou

- Adicionado botão **Entrar com Google** na tela de login.
- Adicionada função `entrarComGoogle()` usando Firebase Auth.
- Melhorado status visual do Firebase na tela de login.
- Mantido login por e-mail/senha e recuperação de senha.
- Mantida a área de cotação automatizada como desenvolvimento, sem Amadeus ativo.

## Firebase

No Firebase Console, deixe ativado:

- Authentication > Método de login > E-mail/senha
- Authentication > Método de login > Google
- Authentication > Configurações > Domínios autorizados > `riquelmerufilima.github.io`

Depois de subir os arquivos no GitHub, atualize com `Ctrl + F5`. Em celular/PWA, limpe cache ou abra em aba anônima para testar.
