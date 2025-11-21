import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[cepMask]',
  standalone: true
})
export class CepMaskDirective {
  constructor(private el: ElementRef<HTMLInputElement>, @Optional() private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(_: Event) {
    const input = this.el.nativeElement;
    const digits = input.value.replace(/\D+/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 5) {
      formatted = digits.slice(0, 5) + '-' + digits.slice(5);
    }
    input.value = formatted;
    if (this.ngControl && this.ngControl.control) {
      this.ngControl.control.setValue(formatted, { emitEvent: false });
    }
  }
}
