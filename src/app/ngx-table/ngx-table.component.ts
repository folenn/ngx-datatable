import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { SelectionModel } from '@angular/cdk/collections';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TableColumnDefinitionDirective } from '../directives/table-column-definition.directive';
import { MediaChange, MediaObserver } from '@angular/flex-layout';

export interface TableColumn {
  name: string;
  propertyName: string;
  translatable?: boolean;
}

/**
 * @param dataSource Material Table data
 * @param displayedColumns array of columns to display
 * @param detailsColumns array of details columns to display
 * @param selection array of items that supposed to be initially selected, should be links to same elements in dataSource.
 * @param selectable property for showing/hiding select column
 * @param editable property for showing/hiding edit/delete column
 * @param deletableOnly property will show only delete button
 * @param isCompactView property to show/hide compact version of table
 * @param customRowAddCallback if set, new row will not be added to table, you'll receive empty callback on itemCreated
 * @param itemCreated emits when new row was added through global 'plus' button
 * @param itemEditStarted emits when row editing was started
 * @param itemEditCancelled emits when row editing was cancelled
 * @param itemCreationCancelled emits when added row was not saved
 * @param itemSaved emits when row was saved after edit
 * @param itemDeleted emits when row was deleted
 * @param expandedItem emits when details view was expanded
 * @param selectedItems emits an array of selected items if any was selected
 * @param editModeStatus emits if some element is in edit mode else emits false
 * @description Add-on over MatTable with editing and detail view possibilities
 */

@Component({
  selector: 'app-ngx-table',
  templateUrl: './ngx-table.component.html',
  styleUrls: ['./ngx-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('*', style({ height: '0px', minHeight: '0px', visibility: 'hidden' })),
      state('collapsed', style({ height: '0px', minHeight: '0px', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('* <=> expanded', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgxTableComponent implements OnChanges, OnDestroy, AfterViewInit {
  _dataSource: MatTableDataSource<any>;
  @Input() set dataSource(data: any) {
    if (this.dataSource instanceof MatTableDataSource) {
      this._dataSource.data = data;
      this._dataSource._updateChangeSubscription();
      this.changeDetectorRef.detectChanges();
    } else {
      this._dataSource = new MatTableDataSource<any>(data);
      this._dataSource._updateChangeSubscription();
      this.changeDetectorRef.detectChanges();
    }
  }

  get dataSource() {
    return this._dataSource;
  }

  @Input() set selectedElement(selectedElement: Observable<any>) {
    selectedElement.subscribe(element => {
      if (element != null) {
        this.expandedElement = element;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  @Input() set selectable(value: boolean) {
    if (!this._selectable && value) {
      this._selectable = value;
      this.columnsIds.unshift('select');
      this.compactTableIds.unshift('select');
    } else if (this._selectable && !value) {
      this._selectable = value;
      this.columnsIds.shift();
      this.compactTableIds.shift();
    }
  }

  get selectable(): boolean {
    return this._selectable;
  }

  @Input() set editable(value: boolean) {
    if (!this._editable && value) {
      this.columnsIds.push('actions');
      this.compactTableIds.push('actions');
    } else if (this._editable && !value) {
      this.columnsIds.pop();
      this.compactTableIds.pop();
    }
  }

  @Input() expandable = true;

  @Input() deletableOnly = false;

  @Input() isCompactView = false;

  private _displayedColumns: TableColumn[] = [];
  private _selectable = false;
  private _editable = false;

  columnsIds: string[] = [];
  customColumnsIds: string[] = [];
  compactTableIds: string[] = ['compact'];
  private isCurrentClientFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

  @Input() set displayedColumns(columns: TableColumn[]) {
    this._displayedColumns = columns || [];
    this._displayedColumns.forEach(column => {
      if (this.editable) {
        this.columnsIds.push(column && column.propertyName);
      } else {
        this.columnsIds.splice(this.columnsIds.length - 1, 0, column && column.propertyName);
      }
    });
    this.customColumnsIds = this.columnsIds.filter(column => !this.serviceColumns.some(serviceColumn => column === serviceColumn));
  }

  get displayedColumns(): TableColumn[] {
    return this._displayedColumns;
  }

  @Input() detailsColumns: TableColumn[] = [];
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ContentChildren(TableColumnDefinitionDirective) columnDefDir: QueryList<TableColumnDefinitionDirective>;
  _selection = new SelectionModel<any>(true, []);
  @Input() set selection(data: any) {
    this.selection.clear();
    if (Array.isArray(data)) {
      this._selection.select(...data);
    } else {
      this._selection.select([]);
    }
  }

  get selection() {
    return this._selection;
  }

  @Input() customRowAddCallback = false;

  filterFormGroup: FormGroup;
  tableFormGroup: FormGroup;

  expandedElement = null;
  editedElement = null;
  newElement = null;
  private serviceColumns = ['select', 'actions'];
  private destroySubject = new Subject();
  private isSelectionModeSelected = false;

  @Output() itemCreated = new EventEmitter<any>();
  @Output() itemEditStarted = new EventEmitter<any>();
  @Output() itemEditCancelled = new EventEmitter<any>();
  @Output() itemCreationCancelled = new EventEmitter<any>();
  @Output() itemSaved = new EventEmitter<any>();
  @Output() itemDeleted = new EventEmitter<any>();
  @Output() expandedItem = new EventEmitter<any>();
  @Output() selectedItems = new EventEmitter<any>();
  @Output() editModeStatus = new EventEmitter<boolean>();

  constructor(private fb: FormBuilder, private mediaObserver: MediaObserver, private changeDetectorRef: ChangeDetectorRef) {
    this.filterFormGroup = this.fb.group({
      filter: ''
    });
    this.tableFormGroup = this.fb.group({
      columns: this.fb.array([])
    });

    this.selection.changed
      .asObservable()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => this.selectedItems.emit(this.selection.selected));

    this.mediaObserver
      .asObservable()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((changes: MediaChange[]) => {
        if (!this.isCompactView) {
          this.isCompactView = changes.some(change => change.mqAlias === 'sm' || change.mqAlias === 'xs');
          this.changeDetectorRef.detectChanges();
        } else {
          this.isCompactView = changes.some(change => change.mqAlias === 'sm' || change.mqAlias === 'xs');
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  ngAfterViewInit(): void {
    this.generateColumnsFromTmpl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { displayedColumns: { currentValue = null } = { currentValue: null } } = changes;
    const { dataSource: { currentValue: data = null } = { currentValue: null } } = changes;

    if (this.columnDefDir && this.columnDefDir.length && !this.customColumnsIds.length) {
      this.generateColumnsFromTmpl();
    } else {
      this.generateReactiveForm();
    }
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
  }

  private generateReactiveForm(force?: boolean) {
    this.tableFormGroup = this.fb.group({
      columns: this.fb.array([])
    });
    if (force) {
      this.customColumnsIds.forEach((columnName: string) => {
        (this.tableFormGroup.get('columns') as FormArray).push(this.fb.group({ [columnName]: '' }));
      });
      this.detailsColumns.forEach((column: TableColumn) => {
        (this.tableFormGroup.get('columns') as FormArray).push(this.fb.group({ [column.propertyName]: '' }));
      });
      return;
    }

    this.dataSource.data.forEach((data, i) => {
      if (i === 0) {
        this.customColumnsIds.forEach((columnName: string) => {
          (this.tableFormGroup.get('columns') as FormArray).push(this.fb.group({ [columnName]: data[columnName] }));
        });
        this.detailsColumns.forEach((column: TableColumn) => {
          (this.tableFormGroup.get('columns') as FormArray).push(this.fb.group({ [column.propertyName]: data[column.propertyName] }));
        });
      }
    });
  }

  private generateColumnsFromTmpl() {
    const displayedColumns: TableColumn[] = [];
    const detailsColumns: TableColumn[] = [];

    // Do nothing if there no html templates for columns
    if (!(this.columnDefDir && this.columnDefDir.length)) {
      return false;
    }
    this.columnDefDir.forEach(({ name, propertyName, translatable, isDetail }) => {
      if (isDetail) {
        detailsColumns.push({
          name,
          propertyName,
          translatable
        });
      } else {
        displayedColumns.push({
          name,
          propertyName,
          translatable
        });
      }
    });
    this.displayedColumns = displayedColumns;
    this.detailsColumns = detailsColumns;
    this.generateReactiveForm();
    this.changeDetectorRef.detectChanges();
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ? this.selection.clear() : this.dataSource.data.forEach(row => this.selection.select(row));
  }

  public toggleSelectionMode(row: any): void {
    this.isSelectionModeSelected = this.selection.isSelected(row);
  }

  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  expandRow(event: MouseEvent, row) {
    event.stopPropagation();
    this.expandedElement = this.expandedElement === row ? null : row;
    this.expandedItem.emit(this.expandedElement);
  }

  public onSelectionByMouseMove(event: any, row: any) {
    event.stopPropagation();
    const buttonHoldValue = this.isCurrentClientFirefox ? event.buttons : event.which;
    if (this.selectable && buttonHoldValue === 1) {
      // which or buttons === 1 means mouse button left is down
      if (this.isSelectionModeSelected && !this.selection.isSelected(row)) {
        this.selection.toggle(row);
      } else if (!this.isSelectionModeSelected && this.selection.isSelected(row)) {
        this.selection.toggle(row);
      }
    }
  }

  public onRowMouseDown(event: any, row: any): void {
    event.stopPropagation();
    if (this.selectable) {
      this.selection.toggle(row);
      this.toggleSelectionMode(row);
    }
  }

  onRowAdded() {
    const newRow = { ...this.dataSource.data[0] };
    for (const key in newRow) {
      if (newRow.hasOwnProperty(key)) {
        newRow[key] = '';
      }
    }
    this.dataSource.data.unshift(newRow);
    this.dataSource._updateChangeSubscription();
    this.generateReactiveForm(true);
    this.newElement = newRow;
    this.editedElement = newRow;
    this.tableFormGroup.reset();
    this.itemCreated.emit();
    this.editModeStatus.emit(true);
  }

  onCustomRowAdded() {
    this.itemCreated.emit();
  }

  onRowSaved(event: MouseEvent, row: any) {
    event.stopPropagation();
    this.editedElement = null;
    this.newElement = null;
    this.tableFormGroup.value.columns.forEach(column => (row = { ...row, ...column }));
    this.dataSource._updateChangeSubscription();
    this.changeDetectorRef.detectChanges();
    console.log(this.dataSource, row);
    this.itemSaved.emit(row);
    this.editModeStatus.emit(false);
  }

  onRowStartedEditing(event: MouseEvent, row: any) {
    event.stopPropagation();
    this.editedElement = row;
    this.itemEditStarted.emit(row);
    this.editModeStatus.emit(true);
  }

  onRowCancelledEditing(event: MouseEvent, row: any) {
    event.stopPropagation();
    this.editedElement = null;

    if (this.newElement) {
      this.dataSource.data.shift();
      this.dataSource._updateChangeSubscription();
      this.newElement = null;
      this.itemCreationCancelled.emit();
    } else {
      this.itemEditCancelled.emit(row);
    }
    this.editModeStatus.emit(false);
  }

  onRowDeleted(event: MouseEvent, row: any) {
    event.stopPropagation();
    this.editedElement = null;
    const rowIndex = this.dataSource.data.findIndex(item => item === row);
    if (rowIndex >= 0) {
      this.dataSource.data.splice(rowIndex, 1);
      this.dataSource._updateChangeSubscription();
    }
    this.itemDeleted.emit(row);
    this.editModeStatus.emit(false);
  }

  onEditInputClick(event: MouseEvent) {
    event.stopPropagation();
  }

  isRowExpanded(row: any) {
    return JSON.stringify(this.expandedElement) === JSON.stringify(row);
  }
}
