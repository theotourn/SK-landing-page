import { Component, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
})
export class PortfolioComponent implements AfterViewInit {


  constructor(private router: Router) {} 

  goHome() {
    this.router.navigateByUrl('/');
  }

  mouseX = 0;
  mouseY = 0;

  selectedImage: number | null = null;

  images = [
    { thumb: '/assets/portfolio/01.jpeg', full: '/assets/portfolio/01.jpeg', alt: 'Obra 1', caption: '' },
    { thumb: '/assets/portfolio/02.jpeg', full: '/assets/portfolio/02.jpeg', alt: 'Obra 2', caption: '' },
    { thumb: '/assets/portfolio/03.png',  full: '/assets/portfolio/03.png',  alt: 'Obra 3', caption: '' },
    { thumb: '/assets/portfolio/04.jpeg', full: '/assets/portfolio/04.jpeg', alt: 'Obra 4', caption: '' },
    { thumb: '/assets/portfolio/05.jpeg', full: '/assets/portfolio/05.jpeg', alt: 'Obra 5', caption: '' },
    { thumb: '/assets/portfolio/06.jpeg', full: '/assets/portfolio/06.jpeg', alt: 'Obra 6', caption: '' },
    { thumb: '/assets/portfolio/07.jpeg', full: '/assets/portfolio/07.jpeg', alt: 'Obra 7', caption: '' },
  ];

  ngAfterViewInit(): void {
    this.animateBackground();
  }

  openImage(index: number) {
    this.selectedImage = index;
    document.body.style.overflow = 'hidden';
  }

  closeImage() {
    this.selectedImage = null;
    document.body.style.overflow = '';
  }

  nextImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.selectedImage === null) return;
    this.selectedImage = (this.selectedImage + 1) % this.images.length;
  }

  prevImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.selectedImage === null) return;
    this.selectedImage = (this.selectedImage - 1 + this.images.length) % this.images.length;
  }

  onImageLoad() {
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (this.selectedImage === null) return;

    if (event.key === 'Escape') {
      this.closeImage();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft') {
      this.prevImage();
    }
  }

  animateBackground() {
    const canvas = document.getElementById('background-stars') as HTMLCanvasElement | null;
    if (!canvas) return;

    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    const ctx2 = maybeCtx as CanvasRenderingContext2D; 

    const stars: {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      spikes: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    const starCount = 100;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    function drawStar(
      x: number,
      y: number,
      radius: number,
      spikes: number,
      rotation: number
    ) {
      const step = Math.PI / spikes;
      let rot = (Math.PI / 2) * 3 + rotation;
      const path = new Path2D();

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
      ctx2.fill(path);
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

    const drawStars = () => {
      ctx2.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        ctx2.fillStyle = `rgba(0, 0, 0, ${star.opacity})`;

        ctx2.save();

        ctx2.translate(star.x, star.y);
        ctx2.rotate(star.rotation);

        drawStar(0, 0, star.size, star.spikes, 0);

        ctx2.restore();
      });
    };

    const animate = () => {
      drawStars();
      updateStars();
      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('mousemove', (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });

    window.addEventListener('resize', resize);
  }
}
