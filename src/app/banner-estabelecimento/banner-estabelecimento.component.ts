import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

declare const QRCodeStyling: any;

@Component({
  selector: 'app-banner-estabelecimento',
  standalone: true,
  imports: [CommonModule,
    MatIconModule,
    RouterModule,
    MatButtonModule],
  templateUrl: './banner-estabelecimento.component.html',
  styleUrls: ['./banner-estabelecimento.component.scss']
})
export class BannerEstabelecimentoComponent implements AfterViewInit, OnInit, OnDestroy {
  private router = inject(Router);
  id: string = '';
  nome: string = '';
  @Input() logo = 'assets/icons/icon-1024x1024.png';
  @Input() background = 'assets/banner-estabelecimento.png';

  @ViewChild('qrcode', { static: true, read: ElementRef }) qrcodeEl!: ElementRef<HTMLDivElement>;
  @ViewChild('estname', { static: true, read: ElementRef }) estnameEl!: ElementRef<HTMLElement>;

  bgWidth = 2480;
  bgHeight = 3508;

  size = 0;
  qrTop = 0;
  qrRight = 0;

  scale = 1;

  private qrInstance: any;

  private routeSubscription: Subscription | undefined;

  constructor(private el: ElementRef<HTMLElement>, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.id = params.get('id') || '';
      this.nome = history.state.nomeEstabelecimento || '';
      this.calculateQrCodeProperties();
      this.render();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private get qrCodeUrl(): string {
    if (this.id) {
      return `${environment.frontendUrl}/estabelecimento/${this.id}`;
    }
    return window.location.href;
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScale();
    this.render();
    this.calculateQrCodeProperties();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.ensureLibrary();
    await this.waitForBackgroundLoad();
    this.updateScale();
    this.calculateQrCodeProperties();
    this.render();
  }

  private async ensureLibrary(): Promise<void> {
    if (typeof (window as any).QRCodeStyling !== 'undefined' || typeof QRCodeStyling !== 'undefined') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qr-code-styling@1.5.0/lib/qr-code-styling.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QRCodeStyling script'));
      document.head.appendChild(script);
    });
  }

  private async waitForBackgroundLoad(): Promise<void> {
    const img = new Image();
    img.src = this.background;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        this.calculateQrCodeProperties();
        resolve();
      };
      img.onerror = () => {
        console.warn('BannerEstabelecimento: background image not found:', this.background);
        resolve();
      };
    });
  }

  private calculateQrCodeProperties(): void {
    this.size = this.bgWidth * 0.35;
    this.qrTop = this.bgHeight * 0.6;
    this.qrRight = this.bgWidth * 0.06;
  }

  private updateScale(): void {
    if (!this.qrcodeEl?.nativeElement) return;
    const parentWidth = this.el.nativeElement.clientWidth;
    if (parentWidth) {
      this.scale = parentWidth / this.bgWidth;
    }
    this.el.nativeElement.style.setProperty('--banner-bg-width', `${this.bgWidth}px`);
  }

  private render(): void {
    const QR = (window as any).QRCodeStyling ?? (typeof QRCodeStyling !== 'undefined' ? QRCodeStyling : undefined);
    if (!QR) return;

    this.qrInstance = new QR({
      width: this.size * this.scale,
      height: this.size * this.scale,
      type: 'canvas',
      data: this.qrCodeUrl,
      image: this.logo,
      imageOptions: { crossOrigin: 'anonymous', hideBackgroundDots: true },
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: '#000000', type: 'square' },
      cornersSquareOptions: { type: 'square', color: '#000000' },
      cornersDotOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#ffffff' },
      margin: 20 * this.scale
    });

    const el = this.qrcodeEl.nativeElement;
    el.innerHTML = '';
    this.qrInstance.append(el);
  }

  async downloadCombined(filename = 'banner-with-qr.png') {
    const QR = (window as any).QRCodeStyling ?? (typeof QRCodeStyling !== 'undefined' ? QRCodeStyling : undefined);
    if (!QR) {
      console.error('QRCodeStyling library not found');
      return;
    }

    const downloadQrInstance = new QR({
      width: this.size,
      height: this.size,
      type: 'canvas',
      data: this.qrCodeUrl,
      image: this.logo,
      imageOptions: { crossOrigin: 'anonymous', hideBackgroundDots: true },
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: '#000000', type: 'square' },
      cornersSquareOptions: { type: 'square', color: '#000000' },
      cornersDotOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#ffffff' },
      margin: 20
    });

    const qrBlob = await downloadQrInstance.getRawData('png');
    if (!qrBlob) {
      console.error('Failed to generate QR code blob');
      return;
    }

    const qrImage = new Image();
    const qrUrl = URL.createObjectURL(qrBlob);
    qrImage.src = qrUrl;
    await new Promise<void>((resolve, reject) => {
      qrImage.onload = () => {
        URL.revokeObjectURL(qrUrl);
        resolve();
      };
      qrImage.onerror = (err) => reject(new Error(`Failed to load QR code image from blob: ${err}`));
    });

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = this.background;
    await new Promise<void>((resolve, reject) => {
      bgImg.onload = () => resolve();
      bgImg.onerror = (err) => reject(new Error(`Failed to load background image: ${err}`));
    });

    const out = document.createElement('canvas');
    out.width = this.bgWidth;
    out.height = this.bgHeight;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fef3d3';
    ctx.fillRect(0, 0, out.width, out.height);

    const scaleRatio = out.width / bgImg.naturalWidth;
    const newBgHeight = bgImg.naturalHeight * scaleRatio;
    const newBgWidth = out.width;

    const bgY = (out.height - newBgHeight) / 2;
    const bgX = 0;

    ctx.drawImage(bgImg, bgX, bgY, newBgWidth, newBgHeight);

    const x = Math.round(out.width - this.qrRight - this.size);
    const y = Math.round(this.qrTop);

    ctx.drawImage(qrImage, x, y, this.size, this.size);

    const estnameElement = this.estnameEl.nativeElement;
    const computedStyle = window.getComputedStyle(estnameElement);

    ctx.font = `${computedStyle.fontWeight} ${parseInt(computedStyle.fontSize, 10) / this.scale}px ${computedStyle.fontFamily}`;
    ctx.fillStyle = computedStyle.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = out.width * 0.5;
    const textY = out.height * 0.4;

    if (this.nome) {
      ctx.fillText(this.nome, textX, textY);
    }

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  goBack(): void {
    this.router.navigate(['/meus-estabelecimentos']);
  }
}
