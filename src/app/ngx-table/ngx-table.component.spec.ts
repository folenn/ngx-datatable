import { MdoTableColumn, MdoTableComponent } from '@app/modules/mdo-ui/components/mdo-table/mdo-table.component';
import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import * as faker from 'faker';
import { SimpleChange, EventEmitter } from '@angular/core';
import { configureTestSuite } from 'ng-bullet';
import { CoreTestingModule } from '@app/modules/core-testing/core-testing.module';

const data = [
  {
    id: faker.random.uuid(),
    name: faker.internet.userName(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    birthday: faker.date.future(2)
  },
  {
    id: faker.random.uuid(),
    name: faker.internet.userName(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    birthday: faker.date.future(2)
  }
];
const displayedColumns: MdoTableColumn[] = [
  {
    name: 'Name',
    propertyName: 'name'
  },
  {
    name: 'First Name',
    propertyName: 'firstName'
  }
];
const detailsColumns: MdoTableColumn[] = [
  {
    name: 'Birthday',
    propertyName: 'birthday'
  }
];

describe('MdoTableComponent', () => {
  let component: MdoTableComponent;
  let fixture: ComponentFixture<MdoTableComponent>;
  let eventEmitterSelectedElement: EventEmitter<any>;

  configureTestSuite(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule, NoopAnimationsModule, CoreTestingModule],
      declarations: []
    });
  });
  beforeEach(() => {
    fixture = TestBed.createComponent(MdoTableComponent);
    component = fixture.componentInstance;
    component.dataSource = data;
    component.displayedColumns = displayedColumns;
    component.isCompactView = false;
    component.detailsColumns = detailsColumns;
    eventEmitterSelectedElement = new EventEmitter();
    component.selectedElement = eventEmitterSelectedElement;

    spyOn(component.expandedItem, 'emit').and.callThrough();
    spyOn(component.itemCreated, 'emit').and.callThrough();
    spyOn(component.itemSaved, 'emit').and.callThrough();
    spyOn(component.itemEditStarted, 'emit').and.callThrough();
    spyOn(component.itemCreationCancelled, 'emit').and.callThrough();
    spyOn(component.itemEditCancelled, 'emit').and.callThrough();
    spyOn(component.itemDeleted, 'emit').and.callThrough();

    component.ngOnChanges({
      displayedColumns: new SimpleChange(null, detailsColumns, true)
    });
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  it('should set displayed columns and custom columns', () => {
    component.selectable = false;
    component.editable = false;
    fixture.detectChanges();

    expect(component.displayedColumns).toEqual(displayedColumns);
    expect(component.columnsIds).toEqual(['firstName', 'name']);
    expect(component.customColumnsIds).toEqual(['firstName', 'name']);
  });

  it('should set displayed columns and custom columns with additional service columns', () => {
    component.editable = true;
    component.selectable = true;

    expect(component.columnsIds).toEqual(['select', 'firstName', 'name', 'actions']);
    expect(component.displayedColumns).toEqual(displayedColumns);
  });

  it('should generate edit form', () => {
    const expected = {
      columns: [{ firstName: data[0].firstName }, { name: data[0].name }, { birthday: data[0].birthday }]
    };

    expect(component.tableFormGroup.value).toEqual(expected);
  });

  it('should toggle all selections', () => {
    component.masterToggle();

    expect(component.selection.selected).toEqual(component.dataSource.data);
  });

  it('should expand row and emit event with that row', () => {
    component.expandRow(new MouseEvent('click'), component.dataSource.data[0]);
    expect(component.expandedElement).toEqual(component.dataSource.data[0]);
    expect(component.expandedItem.emit).toHaveBeenCalledWith(component.dataSource.data[0]);
  });

  it('should add new row with edit mode', () => {
    component.onRowAdded();

    const newRow = {
      id: '',
      name: '',
      firstName: '',
      lastName: '',
      birthday: ''
    };

    expect(component.dataSource.data).toEqual(data);
    expect(component.newElement).toEqual(newRow);
    expect(component.editedElement).toEqual(newRow);
    expect(component.itemCreated.emit).toHaveBeenCalled();
  });

  it('should update edited row/form group and emit value', () => {
    component.onRowStartedEditing(new MouseEvent('click'), component.dataSource.data[0]);
    component.tableFormGroup.patchValue({
      columns: [
        {
          firstName: 'test'
        }
      ]
    });
    component.onRowSaved(new MouseEvent('click'), component.dataSource.data[0]);

    expect(component.editedElement).toBeFalsy();
    expect(component.newElement).toBeFalsy();
    expect(component.dataSource.data[0].firstName).toEqual(data[0].firstName);
    expect(component.itemSaved.emit).toHaveBeenCalledWith({ ...component.dataSource.data[0], firstName: 'test' });
  });

  it('should set edited element and emit event', () => {
    component.onRowStartedEditing(new MouseEvent('click'), component.dataSource.data[0]);

    expect(component.editedElement).toEqual(component.dataSource.data[0]);
    expect(component.itemEditStarted.emit).toHaveBeenCalledWith(component.dataSource.data[0]);
  });

  it('should remove new row and emit event', () => {
    component.onRowAdded();
    component.onRowCancelledEditing(new MouseEvent('click'), component.dataSource.data[0]);

    expect(component.editedElement).toBeFalsy();
    expect(component.dataSource.data).toEqual(data);
    expect(component.itemCreationCancelled.emit).toHaveBeenCalled();
  });

  it('should cancel editing row and emit event', () => {
    component.onRowStartedEditing(new MouseEvent('click'), component.dataSource.data[0]);
    component.onRowCancelledEditing(new MouseEvent('click'), component.dataSource.data[0]);

    expect(component.editedElement).toBeFalsy();
    expect(component.dataSource.data).toEqual(data);
    expect(component.itemEditCancelled.emit).toHaveBeenCalledWith(component.dataSource.data[0]);
  });

  it('should remove row and emit event', () => {
    const deletedItem = { ...component.dataSource.data[0] };
    component.onRowDeleted(new MouseEvent('click'), component.dataSource.data[0]);

    expect(component.editedElement).toBeFalsy();
    expect(component.itemDeleted.emit).toHaveBeenCalledWith(deletedItem);
  });

  it('should select and expand the right element', async(() => {
    const selectedElement = {
      id: 'id1',
      name: 'name1',
      firstName: 'Max',
      lastName: 'Mustermann',
      birthday: new Date()
    };

    eventEmitterSelectedElement.subscribe(() => {
      expect(component.expandedElement).toBe(selectedElement);
    });

    eventEmitterSelectedElement.emit(selectedElement);
  }));

  it('isRowExpanded-method should compare a given row with the expanded element', async(() => {
    const selectedElement = { id: 'id1', name: 'name1' };

    const expandedRow = JSON.parse(JSON.stringify(selectedElement));
    const otherRow = { id: 'id2', name: 'name2' };

    eventEmitterSelectedElement.subscribe(() => {
      const resultExpandedRow = component.isRowExpanded(expandedRow);
      expect(resultExpandedRow).toBeTruthy();
      const resultOtherRow = component.isRowExpanded(otherRow);
      expect(resultOtherRow).toBeFalsy();
    });

    eventEmitterSelectedElement.emit(selectedElement);
  }));
});
