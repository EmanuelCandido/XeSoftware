# Prévias 3D dos projetos

Vídeos em `assets/video/projects/`, gerados assim:

1. **Conteúdo da tela**: capturas dos projetos (com dados fictícios no lugar dos clientes)
   animadas quadro a quadro em uma página HTML e gravadas com Playwright
   (celular 780×1688, notebook 1440×932).
2. **Aparelho 3D** no Blender (Cycles), usando a sequência de imagens como textura da tela:
   - `phone.py`: celular de titânio com fundo transparente;
   - `laptop.py`: notebook no estilo MacBook Pro 14" em estúdio escuro.
     Antes, rode `python design/devices/gen_textures.py` (layout e legendas do teclado,
     grade dos alto-falantes) e baixe o HDRI `studio_small_09_2k.exr` do
     [Poly Haven](https://polyhaven.com/a/studio_small_09) (CC0) para `tex/`.
3. **Composição** (fundo, legendas e logo) e codificação: AV1 em WebM com MP4 H.264
   de reserva, em 960 px e 640 px (celular). As prévias só carregam quando o card
   se aproxima da tela.

Os reflexos na tela ficam em cerca de 6–10% do vidro real, para não esconder o conteúdo.
