import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements AfterViewInit {
  mouseX = 0;
  mouseY = 0;

  ngAfterViewInit(): void {
    this.animateBackground();
  }

  animateBackground() {
    const canvas = document.getElementById('background-stars') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const stars: any[] = [];
    const starCount = 100;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Função para desenhar uma estrela
    function drawStar(x: number, y: number, radius: number, spikes: number, rotation: number) {
      const step = Math.PI / spikes; // Ângulo para cada ponta da estrela
      let rot = (Math.PI / 2) * 3 + rotation; // Posição inicial da estrela, com rotação aplicada
      let path = new Path2D();

      path.moveTo(x, y - radius);

      for (let i = 0; i < spikes; i++) {
        let x1 = x + Math.cos(rot) * radius;
        let y1 = y + Math.sin(rot) * radius;
        path.lineTo(x1, y1);
        rot += step;

        x1 = x - Math.cos(rot) * radius;
        y1 = y - Math.sin(rot) * radius;
        path.lineTo(x1, y1);
        rot += step;
      }

      path.closePath();
      ctx.fill(path);
    }

    // Criação das estrelas com tamanhos, velocidades, rotações variadas
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 10 + 5, // Estrela com tamanho entre 5px e 15px
        speed: Math.random() * 1 + 0.2, // Velocidade da estrela
        opacity: Math.random() * 0.5 + 0.5, // Opacidade para variação no brilho
        spikes: 5, // Número de pontas da estrela
        rotation: Math.random() * Math.PI * 2, // Aleatória entre 0 e 2 * PI (360 graus)
        rotationSpeed: (Math.random() - 0.5) * 0.04, // Velocidade de rotação aleatória entre -0.01 e 0.01 rad/s
      });
    }

    // Função para atualizar a posição das estrelas com a repulsão do cursor e rotação
    const updateStars = () => {
      stars.forEach((star) => {
        // Distância entre o cursor e a estrela
        const dx = star.x - this.mouseX;
        const dy = star.y - this.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Aumenta a força de repulsão para estrelas mais distantes
        const maxDistance = 10000; // Definindo um máximo alcance de repulsão
        const distanceFactor = Math.min(maxDistance, distance); // Limita o alcance máximo
        const force = 5000 / (distanceFactor * distanceFactor + 1); // Maior força de repulsão

        // Calcula o ângulo de repulsão
        const angle = Math.atan2(dy, dx);

        // Repulsão: as estrelas se movem mais rápido para longe do cursor
        star.x += Math.cos(angle) * force;
        star.y += Math.sin(angle) * force;

        // Faz a estrela continuar a cair normalmente
        star.y += star.speed;

        // Atualiza a rotação da estrela com a velocidade de rotação
        star.rotation += star.rotationSpeed;

        // Se a estrela passar da tela, reposiciona ela no topo
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });
    };

    // Função para desenhar as estrelas
    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas antes de redesenhar

      stars.forEach((star) => {
        ctx.fillStyle = `rgba(0, 0, 0, ${star.opacity})`; // Cor branca com opacidade para brilho

        // Salva o estado do contexto antes de aplicar a rotação
        ctx.save();
        
        // Move o contexto para a posição da estrela para que a rotação aconteça em torno dela
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotation);

        // Desenha a estrela com o centro no ponto correto
        drawStar(0, 0, star.size, star.spikes, 0); // Passa as coordenadas centradas no (0,0)
        
        // Restaura o contexto após a rotação
        ctx.restore();
      });
    }

    function animate() {
      drawStars();
      updateStars(); // Chamando a função que atualiza as estrelas
      requestAnimationFrame(animate); // Faz a animação repetir
    }

    animate();

    // Detecta o movimento do mouse e atualiza a posição
    window.addEventListener('mousemove', (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });

    // Ajusta o canvas quando a janela for redimensionada
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}
