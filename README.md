# XE Software — Landing page

Landing page da XE Software, agência de software do Piauí. Site estático em HTML, CSS e JavaScript puro, sem etapa de build.

## Rodando localmente

```bash
python -m http.server 5173
```

Depois abra http://localhost:5173.

## Estrutura

- `index.html`: marcação da página
- `styles.css`: estilos, animações e responsivo (desktop e mobile)
- `script.js`: animações de entrada e scroll, menu mobile, FAQ e formulário
- `assets/`: logo, ícones e imagens exportados do Figma

## Configuração

- **WhatsApp do formulário:** altere `WHATSAPP_NUMBER` no topo de `script.js`.
- **Telefone e Instagram:** atualize os links no rodapé do `index.html`.
- **Imagens dos projetos:** defina `background-image` em cada `.project__img`.
