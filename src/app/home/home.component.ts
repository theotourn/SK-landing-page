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

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 10 + 5, 
        speed: Math.random() * 1 + 0.2, 
        opacity: Math.random() * 0.5 + 0.5, 
        spikes: 5, 
        rotation: Math.random() * Math.PI * 2, 
        rotationSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    
    const updateStars = () => {
      stars.forEach((star) => {
        
        const dx = star.x - this.mouseX;
        const dy = star.y - this.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        
        const maxDistance = 10000; 
        const distanceFactor = Math.min(maxDistance, distance);
        const force = 5000 / (distanceFactor * distanceFactor + 1); 


        const angle = Math.atan2(dy, dx);


        star.x += Math.cos(angle) * force;
        star.y += Math.sin(angle) * force;

        star.y += star.speed;

        star.rotation += star.rotationSpeed;

        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });
    };

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); 

      stars.forEach((star) => {
        ctx.fillStyle = `rgba(0, 0, 0, ${star.opacity})`; 

        ctx.save();
        
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotation);

        drawStar(0, 0, star.size, star.spikes, 0); 
        
        ctx.restore();
      });
    }

    function animate() {
      drawStars();
      updateStars(); 
      requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('mousemove', (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}
