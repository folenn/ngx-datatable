import { Directive, EventEmitter, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[appVisible]'
})
export class VisibleDirective implements OnInit {
  @Output() visible = new EventEmitter();

  ngOnInit(): void {
    this.visible.emit();
  }
}
