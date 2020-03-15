import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableColumnDef]'
})
export class TableColumnDefinitionDirective {
  @Input() name: string;
  @Input() propertyName: string;
  @Input() translatable: boolean;
  @Input() isDetail: boolean;

  constructor(public tpl: TemplateRef<any>) {}
}
